import { LlmService } from '../llm/llm.service';
export interface PedagogyInput {
    rawAnswer: string;
    grade: number;
    language: string;
    learningNeeds: string[];
}
export declare class PedagogyAgentService {
    private readonly llm;
    private readonly logger;
    constructor(llm: LlmService);
    adapt(input: PedagogyInput): Promise<string>;
}
