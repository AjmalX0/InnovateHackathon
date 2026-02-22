import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm/llm.service';

export interface QuizQuestion {
  question: string;
  options:  string[];          // always 4 options
  answer:   string;            // the correct option text
  hint?:    string;
}

export interface QuizOutput {
  topic:     string;
  grade:     number;
  questions: QuizQuestion[];
}

/**
 * QuizService — Step 5
 *
 * Generates a 5-question MCQ quiz for a topic + grade.
 * Questions are Kerala SCERT syllabus-aligned.
 */
@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly llm:    LlmService,
    private readonly config: ConfigService,
  ) {}

  async generate(
    topic:    string,
    grade:    number,
    language: string,
    count     = 5,
  ): Promise<QuizOutput> {
    const langNote =
      language === 'ml'  ? 'Write questions and options in Malayalam script.' :
      language === 'mng' ? 'Write in Manglish (Malayalam in English letters).' :
      'Write in English.';

    const systemPrompt = `You are VidyaBot, an AI tutor for Kerala SCERT Grade ${grade} students.
Generate exactly ${count} multiple-choice quiz questions on: "${topic}".
${langNote}
Questions must match Kerala SCERT Grade ${grade} syllabus difficulty.
Output ONLY valid JSON — no markdown fences:
{
  "topic": "<topic name>",
  "questions": [
    {
      "question": "<question text>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "answer": "<correct option text exactly as in options>",
      "hint": "<one-line hint>"
    }
  ]
}`;

    try {
      const raw = await this.llm.ask(systemPrompt, `Topic: ${topic}, Grade: ${grade}`, {
        temperature: 0.5,
        maxTokens:   900,
        jsonMode:    true,
      });
      const parsed = JSON.parse(raw);
      return {
        topic:     parsed.topic     ?? topic,
        grade,
        questions: parsed.questions ?? [],
      };
    } catch (err) {
      this.logger.warn(`QuizService generation failed: ${err.message}`);
      // Fallback stub so demo never breaks
      return {
        topic,
        grade,
        questions: [
          {
            question: `What is ${topic}?`,
            options:  ['Option A', 'Option B', 'Option C', 'Option D'],
            answer:   'Option A',
            hint:     'Refer to your textbook.',
          },
        ],
      };
    }
  }
}
