import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMessageDto, MessageType } from './dto/send-message.dto';
import { StudentsService } from '../students/students.service';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  studentId: string;
  sessionId: string;
  content: string;           // cleaned text ready for the AI pipeline
  type: MessageType;
  inputLanguage: string;
  grade: number;
  gradeLabel: string;
  learningNeeds: string[];
  documentId?: string;
  timestamp: string;
}

export interface ChatResponse {
  messageId: string;
  sessionId: string;
  receivedText: string;      // echo of clean text input
  studentContext: {
    grade: number;
    gradeLabel: string;
    language: string;
    learningNeeds: string[];
  };
  status: 'queued' | 'processing' | 'ready';
  aiResponse?: string;       // populated after AI pipeline (Step 3+)
}

/**
 * ChatService — Step 1 responsibility:
 *   Accept message → enrich with student context → produce a
 *   structured ChatMessage that the AI orchestrator will consume.
 *
 * In Step 3 this service will forward the ChatMessage to the
 * Python LangGraph service via HTTP and stream back the response.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  // In-memory session store — replace with Redis/Supabase in prod
  private readonly sessions = new Map<string, ChatMessage[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly studentsService: StudentsService,
  ) {}

  /**
   * Receive a message, attach student context, and return a
   * structured payload. The AI call is a placeholder stub here
   * (Step 3 will replace it with a real LangGraph call).
   */
  async processMessage(dto: SendMessageDto): Promise<ChatResponse> {
    // 1. Resolve student context
    const context = this.studentsService.getContextProfile(dto.studentId);

    // 2. Build session id (create new if not provided)
    const sessionId = dto.sessionId ?? uuidv4();

    // 3. Construct structured message
    const message: ChatMessage = {
      id: uuidv4(),
      studentId: dto.studentId,
      sessionId,
      content: this.sanitiseInput(dto.content),
      type: dto.type,
      inputLanguage: dto.inputLanguage ?? 'auto',
      grade: context.grade,
      gradeLabel: context.gradeLabel,
      learningNeeds: context.learningNeeds,
      documentId: dto.documentId,
      timestamp: new Date().toISOString(),
    };

    // 4. Persist to session history
    const history = this.sessions.get(sessionId) ?? [];
    history.push(message);
    this.sessions.set(sessionId, history);

    this.logger.log(
      `[${sessionId}] ${context.gradeLabel} student (${context.language}) → "${message.content.slice(0, 60)}…"`,
    );

    // 5. Stub AI response — Step 3 replaces this with LangGraph call
    const aiResponse = this.stubAiResponse(message);

    return {
      messageId: message.id,
      sessionId,
      receivedText: message.content,
      studentContext: {
        grade: context.grade,
        gradeLabel: context.gradeLabel,
        language: context.language,
        learningNeeds: context.learningNeeds,
      },
      status: 'ready',
      aiResponse,
    };
  }

  /**
   * Return session history for a given session id.
   */
  getSession(sessionId: string): ChatMessage[] {
    return this.sessions.get(sessionId) ?? [];
  }

  /** Basic text sanitisation — trim, collapse whitespace. */
  private sanitiseInput(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ');
  }

  /**
   * Stub response used until Step 3 (LangGraph) is wired in.
   * Gives immediate UI feedback so Flutter can render the flow.
   */
  private stubAiResponse(msg: ChatMessage): string {
    return (
      `[STUB — ${msg.gradeLabel}] ` +
      `Input received: "${msg.content.slice(0, 80)}" ` +
      `(lang: ${msg.inputLanguage}, type: ${msg.type}). ` +
      `Real AI response will be injected in Step 3.`
    );
  }
}
