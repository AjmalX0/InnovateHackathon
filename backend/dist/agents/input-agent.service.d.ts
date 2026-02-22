import { LlmService } from '../llm/llm.service';
export type Intent = 'question' | 'request_notes' | 'request_quiz' | 'upload_query' | 'greeting';
export interface NormalizedInput {
    cleanedText: string;
    intent: Intent;
    detectedLanguage: 'ml' | 'en' | 'mng' | 'auto';
    isVoice: boolean;
}
export declare class InputAgentService {
    private readonly llm;
    private readonly logger;
    constructor(llm: LlmService);
    normalize(rawText: string, inputType: string, language?: string): Promise<NormalizedInput>;
    private ruleBasedIntent;
}
