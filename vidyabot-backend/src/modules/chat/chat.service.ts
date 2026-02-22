import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { MessageRole, InputType } from './entities/message.entity';
import { Message } from './entities/message.entity';
import { CapabilityResponse } from '../capability/entities/capability-response.entity';
import { StudentsService } from '../students/students.service';
import { CapabilityService } from '../capability/capability.service';
import { SpeechService } from '../speech/speech.service';
import { AiService, DoubtResponse } from '../ai/ai.service';
import { CapabilityCluster } from '../../common/enums/capability-cluster.enum';
import { SyllabusService } from '../syllabus/syllabus.service';

export interface DoubtResult {
    response: DoubtResponse;
    fromCache: boolean;
    messageId: string;
}

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
        private readonly studentsService: StudentsService,
        private readonly capabilityService: CapabilityService,
        private readonly speechService: SpeechService,
        private readonly aiService: AiService,
        private readonly syllabusService: SyllabusService,
    ) { }

    private normalizeQuestion(text: string): string {
        return text.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    private hashQuestion(text: string): string {
        return createHash('md5').update(this.normalizeQuestion(text)).digest('hex');
    }

    async handleDoubt(
        studentId: string,
        subject: string,
        chapter: string,
        inputType: 'voice' | 'text',
        text?: string,
        audioBase64?: string,
    ): Promise<DoubtResult> {
        // 1. Transcribe if voice input
        let questionText: string;
        if (inputType === 'voice') {
            if (!audioBase64) {
                throw new BadRequestException('audioBase64 is required for voice input');
            }
            const audioBuffer = Buffer.from(audioBase64, 'base64');
            questionText = await this.speechService.transcribe(audioBuffer);
            this.logger.log(`Transcribed voice input: "${questionText.substring(0, 80)}"`);
        } else {
            if (!text) {
                throw new BadRequestException('text is required for text input');
            }
            questionText = text;
        }

        // 2. Load student and compute capability cluster
        const student = await this.studentsService.getProfile(studentId);

        const { data: recentMessages, error: messagesErr } = await this.supabase
            .from('messages')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .limit(20);

        let cluster: CapabilityCluster;
        if (recentMessages && recentMessages.length > 0) {
            cluster = this.capabilityService.getClusterFromMessages(recentMessages as Message[]);
        } else {
            cluster = this.capabilityService.getCluster(student.capability_score);
        }

        // 3. Hash the normalized question
        const questionHash = this.hashQuestion(questionText);

        // 4. Query capability_responses cache
        const { data: cached, error: cachedErr } = await this.supabase
            .from('capability_responses')
            .select('*')
            .eq('chapter', chapter)
            .eq('capability_cluster', cluster)
            .eq('question_hash', questionHash)
            .limit(1)
            .single();

        let doubtResponse: DoubtResponse;
        let fromCache = false;

        if (cached && !cachedErr) {
            // 5. Cache HIT — increment usage and return
            this.logger.log(`Cache HIT for doubt (hash=${questionHash}), usage_count=${cached.usage_count + 1}`);

            await this.supabase
                .from('capability_responses')
                .update({ usage_count: cached.usage_count + 1 })
                .eq('id', cached.id);

            doubtResponse = typeof cached.response_text === 'string'
                ? JSON.parse(cached.response_text)
                : cached.response_text as DoubtResponse;
            fromCache = true;
        } else {
            // 6. Cache MISS — fetch relevant textbook chunks via RAG and call AI
            this.logger.log(`Cache MISS for doubt (hash=${questionHash}) — fetching RAG context`);

            const relevantChunks = await this.syllabusService.searchRelevantChunks(
                `${chapter} ${questionText}`,
                student.grade,
                subject,
                3
            );

            const ragContext = relevantChunks.length > 0
                ? relevantChunks.map(c => c.content).join('\n\n')
                : `General conceptual knowledge of chapter: ${chapter}`;

            this.logger.log(`Calling AI for doubt resolution with context size = ${ragContext.length}`);

            doubtResponse = await this.aiService.generateDoubtAnswer(
                questionText,
                student,
                ragContext,
                'ml',
                cluster,
            );

            // Save to capability_responses
            await this.supabase
                .from('capability_responses')
                .insert({
                    grade: student.grade,
                    chapter,
                    capability_cluster: cluster,
                    question_hash: questionHash,
                    response_text: JSON.stringify(doubtResponse),
                    usage_count: 1
                });
        }

        // 7. Always save the student message to messages table
        const { data: savedMessage, error: studentMsgErr } = await this.supabase
            .from('messages')
            .insert({
                student_id: studentId,
                role: MessageRole.STUDENT,
                content: questionText,
                input_type: inputType === 'voice' ? InputType.VOICE : InputType.TEXT
            })
            .select()
            .single();

        // Also save the tutor response
        await this.supabase
            .from('messages')
            .insert({
                student_id: studentId,
                role: MessageRole.TUTOR,
                content: doubtResponse.answer,
                input_type: InputType.TEXT
            });

        this.logger.log(`Doubt handled for student ${studentId}, fromCache=${fromCache}`);
        return {
            response: doubtResponse,
            fromCache,
            messageId: savedMessage?.id || 'unknown',
        };
    }

    async getRecentMessages(studentId: string, limit = 20): Promise<Message[]> {
        const { data, error } = await this.supabase
            .from('messages')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            this.logger.error(`Error fetching messages: ${error.message}`);
            return [];
        }
        return data as Message[];
    }
}
