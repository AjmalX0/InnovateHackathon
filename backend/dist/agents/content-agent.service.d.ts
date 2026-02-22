import { LlmService } from '../llm/llm.service';
import { RagService, RagContext } from '../rag/rag.service';
export interface ContentAgentInput {
    query: string;
    grade: number;
    language: string;
    learningNeeds: string[];
    sessionId?: string;
    studentId?: string;
}
export interface ContentAgentOutput {
    answer: string;
    ragContext: RagContext | null;
    sources: Record<string, any>[];
}
export declare class ContentAgentService {
    private readonly llm;
    private readonly rag;
    private readonly logger;
    constructor(llm: LlmService, rag: RagService);
    answer(input: ContentAgentInput): Promise<ContentAgentOutput>;
    private buildSystemPrompt;
    private buildUserMessage;
}
