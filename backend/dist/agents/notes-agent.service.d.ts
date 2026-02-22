import { LlmService } from '../llm/llm.service';
import { SupabaseService } from '../supabase/supabase.service';
export interface NotesOutput {
    title: string;
    summary: string;
    keyPoints: string[];
    rawMarkdown: string;
}
export declare class NotesAgentService {
    private readonly llm;
    private readonly supabase;
    private readonly logger;
    constructor(llm: LlmService, supabase: SupabaseService);
    generate(sessionId: string, grade: number, language: string): Promise<NotesOutput>;
}
