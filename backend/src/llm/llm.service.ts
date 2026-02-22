import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCallOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LlmResponse {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * LlmService — thin axios wrapper over any OpenAI-compatible chat API.
 *
 * Supports:
 *   • Groq  (LLM_PROVIDER=groq, fast free-tier, llama-3.3-70b-versatile)
 *   • OpenAI (LLM_PROVIDER=openai, gpt-4o-mini)
 *
 * Set in .env:
 *   LLM_PROVIDER=groq
 *   LLM_API_KEY=gsk_...
 *   LLM_MODEL=llama-3.3-70b-versatile
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly http: AxiosInstance;
  private readonly model: string;
  private readonly defaultMaxTokens: number;

  constructor(private readonly config: ConfigService) {
    const provider = this.config.get<string>('llm.provider', 'groq');
    const apiKey   = this.config.get<string>('llm.apiKey', '');
    this.model     = this.config.get<string>('llm.model', 'llama-3.3-70b-versatile');
    this.defaultMaxTokens = this.config.get<number>('llm.maxTokens', 1024);

    const baseURL =
      provider === 'openai'
        ? 'https://api.openai.com/v1'
        : 'https://api.groq.com/openai/v1';

    this.http = axios.create({
      baseURL,
      timeout: 60_000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`LLM provider → ${provider} | model → ${this.model}`);
  }

  // ── Core chat completions call ───────────────────────────────────────

  async chat(
    messages: LlmMessage[],
    opts: LlmCallOptions = {},
  ): Promise<LlmResponse> {
    const { temperature = 0.4, maxTokens, jsonMode = false } = opts;

    const body: Record<string, any> = {
      model:       this.model,
      messages,
      temperature,
      max_tokens:  maxTokens ?? this.defaultMaxTokens,
    };

    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    try {
      const { data } = await this.http.post('/chat/completions', body);
      const choice = data.choices?.[0]?.message?.content ?? '';
      return {
        text:             choice,
        model:            data.model,
        promptTokens:     data.usage?.prompt_tokens     ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      };
    } catch (err) {
      const detail = err?.response?.data?.error?.message ?? err.message;
      this.logger.error(`LLM call failed: ${detail}`);
      throw new ServiceUnavailableException(
        `LLM service error: ${detail}. Check LLM_API_KEY and LLM_PROVIDER in .env`,
      );
    }
  }

  // ── Convenience: single user message ────────────────────────────────

  async ask(
    systemPrompt: string,
    userMessage:  string,
    opts: LlmCallOptions = {},
  ): Promise<string> {
    const res = await this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      opts,
    );
    return res.text.trim();
  }
}
