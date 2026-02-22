import {
    Injectable,
    Logger,
    NotFoundException,
    Inject
} from '@nestjs/common';
import { Pool } from 'pg';
import { TeachingBlock } from './entities/teaching-block.entity';
import { StudentsService } from '../students/students.service';
import { CapabilityService } from '../capability/capability.service';
import { SyllabusService } from '../syllabus/syllabus.service';
import { AiService, TeachingResponse } from '../ai/ai.service';
import { CapabilityCluster } from '../../common/enums/capability-cluster.enum';
import { Message } from '../chat/entities/message.entity';

export interface TeachingSessionResult {
    block: TeachingBlock;
    content: TeachingResponse;
    fromCache: boolean;
}

@Injectable()
export class TeachingService {
    private readonly logger = new Logger(TeachingService.name);

    constructor(
        @Inject('DATABASE_POOL') private readonly pool: Pool,
        private readonly studentsService: StudentsService,
        private readonly capabilityService: CapabilityService,
        private readonly syllabusService: SyllabusService,
        private readonly aiService: AiService,
    ) { }

    async startTeachingSession(
        studentId: string,
        subject: string,
        chapter: string,
        recentMessages: Message[] = [],
    ): Promise<TeachingSessionResult> {
        // 1. Load student
        const student = await this.studentsService.getProfile(studentId);

        // 2. Compute capability cluster
        let cluster: CapabilityCluster;
        if (recentMessages.length > 0) {
            cluster = this.capabilityService.getClusterFromMessages(recentMessages);
        } else {
            cluster = this.capabilityService.getCluster(student.capability_score);
        }

        this.logger.log(
            `Starting teaching session for student ${studentId}, cluster=${cluster}, subject=${subject}, chapter=${chapter}`,
        );

        const cachedBlockRes = await this.pool.query(
            `SELECT * FROM teaching_blocks WHERE grade = $1 AND subject = $2 AND chapter = $3 AND capability_cluster = $4 LIMIT 1`,
            [student.grade, subject, chapter, cluster]
        );
        const cachedBlock = cachedBlockRes.rows[0];

        if (cachedBlock) {
            this.logger.log(`Cache HIT for teaching block (id=${cachedBlock.id}), returning immediately`);
            const parsed = JSON.parse(cachedBlock.content) as TeachingResponse;
            return {
                block: cachedBlock,
                content: parsed,
                fromCache: true,
            };
        }

        // 4. Cache miss — fetch syllabus via RAG
        this.logger.log(`Cache MISS — fetching syllabus via RAG and generating via AI`);

        let syllabusChunks = await this.syllabusService.searchRelevantChunks(
            chapter,
            student.grade,
            subject,
            4
        );

        // Fallback if RAG returned nothing (e.g. pgvector not installed or textbook not uploaded)
        if (syllabusChunks.length === 0) {
            syllabusChunks = await this.syllabusService.getChunks(
                student.grade,
                subject,
                chapter,
            );
        }

        if (syllabusChunks.length === 0) {
            this.logger.warn(`No textbook chunks found for grade=${student.grade}, subject=${subject}, chapter=${chapter}`);
        }

        const aiResponse = await this.aiService.generateTeaching(
            student,
            syllabusChunks,
            'ml',
            cluster,
        );

        // 5. Save new teaching block to DB
        const newBlockRes = await this.pool.query(
            `INSERT INTO teaching_blocks (grade, subject, chapter, capability_cluster, content)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [student.grade, subject, chapter, cluster, JSON.stringify(aiResponse)]
        );
        const savedBlock = newBlockRes.rows[0];

        this.logger.log(`Saved new teaching block (id=${savedBlock.id})`);
        return {
            block: savedBlock,
            content: aiResponse,
            fromCache: false,
        };
    }
}
