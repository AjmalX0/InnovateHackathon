import { InputAgentService, Intent } from '../agents/input-agent.service';
import { ContentAgentService } from '../agents/content-agent.service';
import { PedagogyAgentService } from '../agents/pedagogy-agent.service';
import { NotesAgentService, NotesOutput } from '../agents/notes-agent.service';
import { QuizService, QuizOutput } from '../output/quiz.service';
import { TtsService, TtsOutput } from '../output/tts.service';
import { OrchestrateDto } from './dto/orchestrate.dto';
export interface OrchestratorResult {
    sessionId: string;
    intent: Intent;
    answer: string;
    language: string;
    sources: Record<string, any>[];
    notes?: NotesOutput;
    quiz?: QuizOutput;
    tts?: TtsOutput;
    metadata: {
        ragUsed: boolean;
        pedagogyUsed: boolean;
        chunksFound: number;
    };
}
export declare class OrchestratorService {
    private readonly inputAgent;
    private readonly contentAgent;
    private readonly pedagogyAgent;
    private readonly notesAgent;
    private readonly quizService;
    private readonly ttsService;
    private readonly logger;
    constructor(inputAgent: InputAgentService, contentAgent: ContentAgentService, pedagogyAgent: PedagogyAgentService, notesAgent: NotesAgentService, quizService: QuizService, ttsService: TtsService);
    process(dto: OrchestrateDto): Promise<OrchestratorResult>;
    private greetingResponse;
    private extractQuizTopic;
    private quizToText;
}
