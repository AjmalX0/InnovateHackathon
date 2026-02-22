import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InputAgentService, Intent } from '../agents/input-agent.service';
import { ContentAgentService } from '../agents/content-agent.service';
import { PedagogyAgentService } from '../agents/pedagogy-agent.service';
import { NotesAgentService, NotesOutput } from '../agents/notes-agent.service';
import { QuizService, QuizOutput } from '../output/quiz.service';
import { TtsService, TtsOutput } from '../output/tts.service';
import { OrchestrateDto } from './dto/orchestrate.dto';

export interface OrchestratorResult {
  sessionId:    string;
  intent:       Intent;
  answer:       string;
  language:     string;
  sources:      Record<string, any>[];
  notes?:       NotesOutput;
  quiz?:        QuizOutput;
  tts?:         TtsOutput;
  metadata: {
    ragUsed:       boolean;
    pedagogyUsed:  boolean;
    chunksFound:   number;
  };
}

/**
 * OrchestratorService — Step 3
 *
 * This is the brain of VidyaBot. It:
 *   1. Calls InputAgent  → classifies intent, detects language
 *   2. Routes to the appropriate agent(s)
 *   3. Runs PedagogyAgent on every answer
 *   4. Optionally generates TTS
 *   5. Returns a uniform OrchestratorResult
 *
 * Intent routing:
 *   question        → ContentAgent → PedagogyAgent
 *   request_notes   → NotesAgent
 *   request_quiz    → QuizService
 *   upload_query    → ContentAgent (document context note in query)
 *   greeting        → Fast LLM response (no RAG)
 */
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly inputAgent:    InputAgentService,
    private readonly contentAgent:  ContentAgentService,
    private readonly pedagogyAgent: PedagogyAgentService,
    private readonly notesAgent:    NotesAgentService,
    private readonly quizService:   QuizService,
    private readonly ttsService:    TtsService,
  ) {}

  async process(dto: OrchestrateDto): Promise<OrchestratorResult> {
    const sessionId  = dto.sessionId ?? uuidv4();
    const language   = dto.language  ?? 'auto';
    const inputType  = dto.inputType ?? 'text';
    const learningNeeds = dto.learningNeeds ?? [];

    this.logger.log(
      `[${sessionId}] Orchestrating: grade=${dto.grade}, lang=${language}, type=${inputType}`,
    );

    // ── 1. Input Agent — normalize & classify ───────────────────────────
    const normalized = await this.inputAgent.normalize(
      dto.content,
      inputType,
      language,
    );

    const effectiveLanguage = normalized.detectedLanguage !== 'auto'
      ? normalized.detectedLanguage
      : (language !== 'auto' ? language : 'en');

    this.logger.log(`[${sessionId}] Intent: ${normalized.intent}, Lang: ${effectiveLanguage}`);

    // ── 2. Route by intent ───────────────────────────────────────────────

    let answer      = '';
    let sources:    Record<string, any>[] = [];
    let notes:      NotesOutput | undefined;
    let quiz:       QuizOutput  | undefined;
    let ragUsed     = false;
    let chunksFound = 0;

    switch (normalized.intent) {

      // ── Greeting ─────────────────────────────────────────────────────
      case 'greeting': {
        answer = this.greetingResponse(dto.grade, effectiveLanguage);
        break;
      }

      // ── Request Notes ─────────────────────────────────────────────────
      case 'request_notes': {
        notes  = await this.notesAgent.generate(sessionId, dto.grade, effectiveLanguage);
        answer = `📒 Notes generated!\n\n${notes.rawMarkdown}`;
        break;
      }

      // ── Request Quiz ──────────────────────────────────────────────────
      case 'request_quiz': {
        // Extract topic from the message — everything after trigger words
        const topic = this.extractQuizTopic(normalized.cleanedText) || 'general revision';
        quiz   = await this.quizService.generate(topic, dto.grade, effectiveLanguage);
        answer = this.quizToText(quiz);
        break;
      }

      // ── Question / Upload Query (default) ─────────────────────────────
      case 'question':
      case 'upload_query':
      default: {
        const contentResult = await this.contentAgent.answer({
          query:         normalized.cleanedText,
          grade:         dto.grade,
          language:      effectiveLanguage,
          learningNeeds,
          sessionId,
          studentId:     dto.studentId,
        });

        answer      = contentResult.answer;
        sources     = contentResult.sources;
        ragUsed     = !!contentResult.ragContext;
        chunksFound = contentResult.ragContext?.chunksFound ?? 0;

        // Pedagogy adaptation for grades 1–8 or students with learning needs
        if (dto.grade <= 8 || learningNeeds.length) {
          answer = await this.pedagogyAgent.adapt({
            rawAnswer:     answer,
            grade:         dto.grade,
            language:      effectiveLanguage,
            learningNeeds,
          });
        }
        break;
      }
    }

    // ── 3. Optional TTS ─────────────────────────────────────────────────
    let tts: TtsOutput | undefined;
    if (dto.withTts) {
      tts = await this.ttsService.synthesize(answer, effectiveLanguage);
    }

    return {
      sessionId,
      intent:   normalized.intent,
      answer,
      language: effectiveLanguage,
      sources,
      notes,
      quiz,
      tts,
      metadata: { ragUsed, pedagogyUsed: dto.grade <= 8 || !!learningNeeds.length, chunksFound },
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private greetingResponse(grade: number, language: string): string {
    if (language === 'ml') {
      return `നമസ്കാരം! ഞാൻ VidyaBot ആണ്. Grade ${grade} Kerala SCERT syllabus-ൽ നിങ്ങളെ സഹായിക്കാൻ ഞാൻ ഇവിടെ ഉണ്ട്. ഏതു subject-ലെ question ആണ്?`;
    }
    if (language === 'mng') {
      return `Namaskaram! Njan VidyaBot aanu. Grade ${grade} Kerala SCERT syllabus-il njangal help cheyyam. Enthu subject question undu?`;
    }
    return `Hi there! I'm VidyaBot, your Grade ${grade} Kerala SCERT tutor. What would you like to learn today?`;
  }

  private extractQuizTopic(text: string): string {
    // Remove common trigger words and return the rest as topic
    return text
      .replace(/quiz|test|questions|mcq|practice|generate|make|create|tharuka|pariksha/gi, '')
      .replace(/on|about|for|in|of/gi, '')
      .trim();
  }

  private quizToText(quiz: QuizOutput): string {
    const lines = [`📝 **${quiz.topic} Quiz (Grade ${quiz.grade})**\n`];
    quiz.questions.forEach((q, i) => {
      lines.push(`**Q${i + 1}.** ${q.question}`);
      q.options.forEach((opt, oi) => {
        const label = ['A', 'B', 'C', 'D'][oi];
        lines.push(`  ${label}) ${opt}`);
      });
      lines.push(`  ✅ Answer: ${q.answer}`);
      if (q.hint) lines.push(`  💡 Hint: ${q.hint}`);
      lines.push('');
    });
    return lines.join('\n');
  }
}
