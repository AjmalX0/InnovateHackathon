import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
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
        @Inject('DATABASE_POOL') private readonly pool: Pool,
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
        const recentMessagesRes = await this.pool.query(
            `SELECT * FROM messages WHERE student_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [studentId]
        );
        const recentMessages = recentMessagesRes.rows;

        let cluster: CapabilityCluster;
        if (recentMessages.length > 0) {
            cluster = this.capabilityService.getClusterFromMessages(recentMessages);
        } else {
            cluster = this.capabilityService.getCluster(student.capability_score);
        }

        // 3. Hash the normalized question
        const questionHash = this.hashQuestion(questionText);

        // 4. Query capability_responses cache
        const cachedRes = await this.pool.query(
            `SELECT * FROM capability_responses WHERE chapter = $1 AND capability_cluster = $2 AND question_hash = $3 LIMIT 1`,
            [chapter, cluster, questionHash]
        );
        const cached = cachedRes.rows[0];

        let doubtResponse: DoubtResponse;
        let fromCache = false;

        if (cached) {
            // 5. Cache HIT — increment usage and return
            this.logger.log(`Cache HIT for doubt (hash=${questionHash}), usage_count=${cached.usage_count + 1}`);
            await this.pool.query(
                `UPDATE capability_responses SET usage_count = $1 WHERE id = $2`,
                [cached.usage_count + 1, cached.id]
            );
            doubtResponse = JSON.parse(cached.response_text) as DoubtResponse;
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
                ? relevantChunks.map(c => c.content).join('\\n\\n')
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
            await this.pool.query(
                `INSERT INTO capability_responses (grade, chapter, capability_cluster, question_hash, response_text, usage_count)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [student.grade, chapter, cluster, questionHash, JSON.stringify(doubtResponse), 1]
            );
        }

        // 7. Always save the student message to messages table
        const studentMessageRes = await this.pool.query(
            `INSERT INTO messages (student_id, role, content, input_type) VALUES ($1, $2, $3, $4) RETURNING *`,
            [studentId, MessageRole.STUDENT, questionText, inputType === 'voice' ? InputType.VOICE : InputType.TEXT]
        );
        const savedMessage = studentMessageRes.rows[0];

        // Also save the tutor response
        await this.pool.query(
            `INSERT INTO messages (student_id, role, content, input_type) VALUES ($1, $2, $3, $4)`,
            [studentId, MessageRole.TUTOR, doubtResponse.answer, InputType.TEXT]
        );

        this.logger.log(`Doubt handled for student ${studentId}, fromCache=${fromCache}`);
        return {
            response: doubtResponse,
            fromCache,
            messageId: savedMessage.id,
        };
    }

    async getRecentMessages(studentId: string, limit = 20): Promise<Message[]> {
        const res = await this.pool.query(
            `SELECT * FROM messages WHERE student_id = $1 ORDER BY created_at DESC LIMIT $2`,
            [studentId, limit]
        );
        return res.rows;
    }
}
