import { ConfigService } from '@nestjs/config';
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
export declare class LlmService {
    private readonly config;
    private readonly logger;
    private readonly http;
    private readonly model;
    private readonly defaultMaxTokens;
    constructor(config: ConfigService);
    chat(messages: LlmMessage[], opts?: LlmCallOptions): Promise<LlmResponse>;
    ask(systemPrompt: string, userMessage: string, opts?: LlmCallOptions): Promise<string>;
}
