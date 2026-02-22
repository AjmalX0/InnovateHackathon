import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

export type Intent =
  | 'question'
  | 'request_notes'
  | 'request_quiz'
  | 'upload_query'
  | 'greeting';

export interface NormalizedInput {
  cleanedText:      string;
  intent:           Intent;
  detectedLanguage: 'ml' | 'en' | 'mng' | 'auto';
  isVoice:          boolean;
}

/**
 * InputAgent — Step 4/1
 *
 * Responsibilities:
 *   1. Trim / sanitise raw text
 *   2. Classify intent (question | request_notes | request_quiz | upload_query | greeting)
 *   3. Detect input language hint (ml / en / mng / auto)
 *
 * Uses LLM for classification so it handles Malayalam, English & Manglish naturally.
 * Falls back to rule-based classification on LLM failure.
 */
@Injectable()
export class InputAgentService {
  private readonly logger = new Logger(InputAgentService.name);

  constructor(private readonly llm: LlmService) {}

  async normalize(
    rawText:    string,
    inputType:  string, // 'text' | 'voice' | 'image' | 'document'
    language?:  string,
  ): Promise<NormalizedInput> {
    const cleanedText = rawText.trim().replace(/\s+/g, ' ');

    // Fast rule-based shortcuts so we don't burn tokens on trivial cases
    const ruleIntent = this.ruleBasedIntent(cleanedText);
    if (ruleIntent) {
      return {
        cleanedText,
        intent:           ruleIntent,
        detectedLanguage: (language as any) ?? 'auto',
        isVoice:          inputType === 'voice',
      };
    }

    // LLM-based classification for anything ambiguous
    const systemPrompt = `You are VidyaBot, an AI tutor for Kerala SCERT students (grades 1-12).
Classify the student's message into EXACTLY ONE of these intents:
  • question        — student asks about a subject/topic
  • request_notes   — student asks to generate notes or summary
  • request_quiz    — student asks to generate a quiz or test questions
  • upload_query    — student is asking about an uploaded document/image
  • greeting        — hello, hi, thanks, etc.

Also detect the language:
  • ml    — Malayalam script
  • en    — English
  • mng   — Manglish (Malayalam written in Roman letters)
  • auto  — unclear / mixed

Respond ONLY with valid JSON in this exact shape:
{"intent":"<intent>","language":"<language_code>"}`;

    try {
      const raw = await this.llm.ask(systemPrompt, cleanedText, {
        temperature: 0.0,
        maxTokens:   60,
        jsonMode:    true,
      });
      const parsed = JSON.parse(raw);
      return {
        cleanedText,
        intent:           (parsed.intent as Intent)   ?? 'question',
        detectedLanguage: (parsed.language as any)    ?? 'auto',
        isVoice:          inputType === 'voice',
      };
    } catch (err) {
      this.logger.warn(`InputAgent LLM classify failed, defaulting to 'question': ${err.message}`);
      return {
        cleanedText,
        intent:           'question',
        detectedLanguage: (language as any) ?? 'auto',
        isVoice:          inputType === 'voice',
      };
    }
  }

  // ── Rule-based fast path ─────────────────────────────────────────────

  private ruleBasedIntent(text: string): Intent | null {
    const lower = text.toLowerCase();
    const notesTriggers  = ['notes', 'summary', 'summarize', 'summarise', 'notes banao', 'notes undakku', 'kuripp'];
    const quizTriggers   = ['quiz', 'test', 'questions', 'mcq', 'practice', 'exam', 'tharuka', 'ചോദ്യം', 'pariksha'];
    const greetTriggers  = ['hello', 'hi ', 'hey ', 'thanks', 'thank you', 'നമസ്കാരം', 'നന്ദി'];

    if (notesTriggers.some(t => lower.includes(t))) return 'request_notes';
    if (quizTriggers.some(t  => lower.includes(t))) return 'request_quiz';
    if (greetTriggers.some(t => lower.startsWith(t.trim()) || lower === t.trim())) return 'greeting';
    return null;
  }
}
