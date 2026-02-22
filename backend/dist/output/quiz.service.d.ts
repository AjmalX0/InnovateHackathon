import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm/llm.service';
export interface QuizQuestion {
    question: string;
    options: string[];
    answer: string;
    hint?: string;
}
export interface QuizOutput {
    topic: string;
    grade: number;
    questions: QuizQuestion[];
}
export declare class QuizService {
    private readonly llm;
    private readonly config;
    private readonly logger;
    constructor(llm: LlmService, config: ConfigService);
    generate(topic: string, grade: number, language: string, count?: number): Promise<QuizOutput>;
}
