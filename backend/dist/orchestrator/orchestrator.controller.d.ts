import { OrchestratorService } from './orchestrator.service';
import { OrchestrateDto } from './dto/orchestrate.dto';
import { NotesAgentService } from '../agents/notes-agent.service';
import { QuizService } from '../output/quiz.service';
export declare class OrchestratorController {
    private readonly orchestrator;
    private readonly notesAgent;
    private readonly quizService;
    constructor(orchestrator: OrchestratorService, notesAgent: NotesAgentService, quizService: QuizService);
    process(dto: OrchestrateDto): Promise<import("./orchestrator.service").OrchestratorResult>;
    notes(sessionId: string, grade: string, language?: string): Promise<import("../agents/notes-agent.service").NotesOutput>;
    quiz(body: {
        topic: string;
        grade: number;
        language?: string;
        count?: number;
    }): Promise<import("../output/quiz.service").QuizOutput>;
}
