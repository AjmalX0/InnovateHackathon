import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMessageDto, MessageType } from './dto/send-message.dto';
import { StudentsService } from '../students/students.service';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

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
}

/**
 * ChatService — persists every message to Supabase chat_messages.
 * Step 3 will replace stubAiResponse with a real LangGraph call.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly studentsService: StudentsService,
    private readonly supabase: SupabaseService,
  ) {}

  async processMessage(dto: SendMessageDto): Promise<ChatResponse> {
    // 1. Fetch student context from Supabase
    const context = await this.studentsService.getContextProfile(dto.studentId);

    // 2. Session id — use provided or generate new
    const sessionId = dto.sessionId ?? uuidv4();
    const cleanContent = this.sanitiseInput(dto.content);
    const aiResponse = this.stubAiResponse(cleanContent, context.gradeLabel, dto.type);

    // 3. Persist to Supabase
    const { data, error } = await this.supabase.db
      .from('chat_messages')
      .insert({
        student_id:     dto.studentId,
        session_id:     sessionId,
        content:        cleanContent,
        type:           dto.type,
        input_language: dto.inputLanguage ?? 'auto',
        grade:          context.grade,
        grade_label:    context.gradeLabel,
        learning_needs: context.learningNeeds,
        document_id:    dto.documentId ?? null,
        ai_response:    aiResponse,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    this.logger.log(
      `[${sessionId}] ${context.gradeLabel} (${context.language}) → "${cleanContent.slice(0, 60)}…"`,
    );

    return {
      messageId: data.id,
      sessionId,
      receivedText: cleanContent,
      studentContext: {
        grade:         context.grade,
        gradeLabel:    context.gradeLabel,
        language:      context.language,
        learningNeeds: context.learningNeeds,
      },
      status: 'ready',
      aiResponse,
    };
  }

  async getSession(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.supabase.db
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => this.toMessage(r));
  }

  private sanitiseInput(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ');
  }

  private stubAiResponse(content: string, gradeLabel: string, type: string): string {
    return (
      `[STUB — ${gradeLabel}] ` +
      `Input received: "${content.slice(0, 80)}" ` +
      `(type: ${type}). ` +
      `Real AI response will be injected in Step 3.`
    );
  }

  private toMessage(row: any): ChatMessage {
    return {
      id:            row.id,
      studentId:     row.student_id,
      sessionId:     row.session_id,
      content:       row.content,
      type:          row.type as MessageType,
      inputLanguage: row.input_language,
      grade:         row.grade,
      gradeLabel:    row.grade_label,
      learningNeeds: row.learning_needs ?? [],
      documentId:    row.document_id,
      aiResponse:    row.ai_response,
      timestamp:     row.timestamp,
    };
  }
}
