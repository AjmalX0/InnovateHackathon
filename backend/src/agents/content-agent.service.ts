import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { RagService, RagContext } from '../rag/rag.service';

export interface ContentAgentInput {
  query:         string;
  grade:         number;
  language:      string;
  learningNeeds: string[];
  sessionId?:    string;
  studentId?:    string;
}

export interface ContentAgentOutput {
  answer:      string;
  ragContext:  RagContext | null;
  sources:     Record<string, any>[];
}

/**
 * ContentAgent — Step 4/2  (core RAG + LLM agent)
 *
 * Pipeline:
 *   student query
 *     → RagService.query()       (retrieve Kerala SCERT context)
 *     → build grounded prompt    (context + query + learner profile)
 *     → LlmService.chat()        (generate answer)
 *     → return annotated answer
 */
@Injectable()
export class ContentAgentService {
  private readonly logger = new Logger(ContentAgentService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly rag: RagService,
  ) {}

  async answer(input: ContentAgentInput): Promise<ContentAgentOutput> {
    // 1. Retrieve relevant Kerala SCERT syllabus chunks
    let ragContext: RagContext | null = null;
    try {
      ragContext = await this.rag.query({
        query:     input.query,
        grade:     input.grade,
        language:  input.language as any,
        topK:      5,
        studentId: input.studentId,
      });
      this.logger.log(`RAG retrieved ${ragContext.chunksFound} chunks for grade ${input.grade}`);
    } catch (err) {
      // RAG failure is non-fatal — answer without context
      this.logger.warn(`RAG unavailable, answering without context: ${err.message}`);
    }

    // 2. Build system prompt (Kerala-aware tutor)
    const systemPrompt = this.buildSystemPrompt(input.grade, input.language, input.learningNeeds);

    // 3. Build user message with grounding context
    const userMessage = this.buildUserMessage(input.query, ragContext);

    // 4. Call LLM
    const llmResponse = await this.llm.ask(systemPrompt, userMessage, {
      temperature: 0.35,
      maxTokens:   900,
    });

    return {
      answer:     llmResponse,
      ragContext,
      sources:    ragContext?.sources ?? [],
    };
  }

  // ── Prompt builders ──────────────────────────────────────────────────

  private buildSystemPrompt(
    grade:         number,
    language:      string,
    learningNeeds: string[],
  ): string {
    const gradeDesc = grade <= 5 ? 'primary school' : grade <= 8 ? 'upper primary' : 'high school';
    const langNote =
      language === 'ml'
        ? 'Reply in Malayalam (മലയാളം) script.'
        : language === 'mng'
        ? 'Reply in Manglish (Malayalam written in English letters).'
        : 'Reply in simple English unless the student used Malayalam.';

    const needsNote =
      learningNeeds && learningNeeds.length
        ? `The student has these learning needs: ${learningNeeds.join(', ')}. Adjust your explanation accordingly.`
        : '';

    return `You are VidyaBot, a friendly AI tutor for Kerala SCERT ${gradeDesc} students (Grade ${grade}).
You always explain concepts using Kerala examples, local context, and the Kerala syllabus.
${langNote}
${needsNote}

Guidelines:
- Use short paragraphs and bullet points for clarity.
- Give ONE real-world Kerala example per concept.
- If the syllabus context is provided below, BASE your answer on it.
- If the context does not cover the question, answer from general knowledge but note it.
- Never say you are a language model. Stay in the VidyaBot persona.
- Keep your answer concise enough for a student — 150–300 words maximum.`;
  }

  private buildUserMessage(query: string, rag: RagContext | null): string {
    if (!rag || !rag.context) {
      return `Student question: ${query}`;
    }
    return `--- Kerala SCERT Syllabus Context (Grade ${rag.grade}) ---
${rag.context}
--- End of Context ---

Student question: ${query}`;
  }
}
