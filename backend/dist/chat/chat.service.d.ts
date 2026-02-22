import { ConfigService } from '@nestjs/config';
import { SendMessageDto, MessageType } from './dto/send-message.dto';
import { StudentsService } from '../students/students.service';
import { SupabaseService } from '../supabase/supabase.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
export interface ChatMessage {
    id: string;
    studentId: string;
    sessionId: string;
    content: string;
    type: MessageType;
    inputLanguage: string;
    grade: number;
    gradeLabel: string;
    learningNeeds: string[];
    documentId?: string;
    aiResponse?: string;
    timestamp: string;
}
export interface ChatResponse {
    messageId: string;
    sessionId: string;
    receivedText: string;
    studentContext: {
        grade: number;
        gradeLabel: string;
        language: string;
        learningNeeds: string[];
    };
    status: 'queued' | 'processing' | 'ready';
    aiResponse?: string;
    sources?: Record<string, any>[];
}
export declare class ChatService {
    private readonly configService;
    private readonly studentsService;
    private readonly supabase;
    private readonly orchestrator;
    private readonly logger;
    constructor(configService: ConfigService, studentsService: StudentsService, supabase: SupabaseService, orchestrator: OrchestratorService);
    processMessage(dto: SendMessageDto): Promise<ChatResponse>;
    getSession(sessionId: string): Promise<ChatMessage[]>;
    private sanitiseInput;
    private stubAiResponse;
    private toMessage;
}
