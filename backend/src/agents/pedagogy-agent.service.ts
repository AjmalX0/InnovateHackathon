import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

export interface PedagogyInput {
  rawAnswer:     string;
  grade:         number;
  language:      string;
  learningNeeds: string[];
}

/**
 * PedagogyAgent — Step 4/3
 *
 * Takes an answer from ContentAgent and re-writes it at the
 * appropriate reading level & pedagogical style for the student's grade.
 *
 * Grade bands:
 *   1–5  → very simple, stories/analogies, minimal jargon
 *   6–8  → slightly complex, introduce terms with explanations
 *   9–12 → academic language, exam-ready phrasing
 *
 * For a hackathon demo, the adaptation is done with a focused LLM call
 * so it's fast (only the answer is sent, not the full RAG context again).
 * If grade is already ≥ 9 and answer looks academic, it passes through unchanged.
 */
@Injectable()
export class PedagogyAgentService {
  private readonly logger = new Logger(PedagogyAgentService.name);

  constructor(private readonly llm: LlmService) {}

  async adapt(input: PedagogyInput): Promise<string> {
    const { rawAnswer, grade, language, learningNeeds } = input;

    // Skip adaptation for high-school students — the ContentAgent
    // already targets the correct level via its system prompt.
    if (grade >= 9 && !learningNeeds.length) {
      return rawAnswer;
    }

    const levelDesc =
      grade <= 5
        ? 'a Grade ' + grade + ' primary school child (age ' + (grade + 5) + '). Use very simple words, short sentences, and a fun story or analogy. Avoid all technical jargon.'
        : 'a Grade ' + grade + ' upper primary student. Use simple language but introduce subject terms. One example is enough.';

    const langNote =
      language === 'ml' ? 'Write the adapted answer in Malayalam script.' :
      language === 'mng' ? 'Write in Manglish (Malayalam in English letters).' :
      'Write in simple English.';

    const needsNote = learningNeeds.length
      ? `Extra note — student has: ${learningNeeds.join(', ')}. Make the explanation extra clear and patient.`
      : '';

    const prompt = `You are a compassionate Kerala SCERT teacher.
Rewrite the answer below so it is perfectly understood by ${levelDesc}
${langNote}
${needsNote}
Do NOT add new information. Only simplify the existing answer.
Keep bullet points if present. Max 200 words.`;

    try {
      const adapted = await this.llm.ask(prompt, rawAnswer, {
        temperature: 0.3,
        maxTokens:   500,
      });
      return adapted;
    } catch (err) {
      // Graceful degradation — return the unadapted answer
      this.logger.warn(`PedagogyAgent adaptation failed, returning raw: ${err.message}`);
      return rawAnswer;
    }
  }
}
