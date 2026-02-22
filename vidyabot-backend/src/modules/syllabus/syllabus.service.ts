import { Injectable, Logger, Inject, InternalServerErrorException } from '@nestjs/common';
import { Pool } from 'pg';
import { SyllabusChunk } from './entities/syllabus-chunk.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class SyllabusService {
    private readonly logger = new Logger(SyllabusService.name);

    constructor(
        @Inject('DATABASE_POOL') private readonly pool: Pool,
        private readonly aiService: AiService,
    ) { }

    async getChunks(grade: number, subject: string, chapter: string): Promise<SyllabusChunk[]> {
        const query = `
            SELECT id, grade, subject, chapter, content, chunk_order 
            FROM syllabus_chunks
            WHERE grade <= $1 AND chapter = $2 AND subject = $3
            ORDER BY chunk_order ASC
            LIMIT 3;
        `;
        const result = await this.pool.query(query, [grade, chapter, subject]);
        const chunks = result.rows;

        this.logger.debug(
            `Found ${chunks.length} syllabus chunks for grade=${grade}, subject=${subject}, chapter=${chapter}`,
        );
        return chunks;
    }

    async searchRelevantChunks(queryText: string, grade: number, subject: string, limit = 3): Promise<SyllabusChunk[]> {
        try {
            // Generate embedding for the search query
            const queryEmbedding = await this.aiService.generateEmbedding(queryText);
            const pgVectorStr = '[' + queryEmbedding.join(',') + ']';

            // Perform Cosine Similarity Search using pgvector (<=> operator)
            const query = `
                SELECT id, grade, subject, chapter, content, chunk_order,
                    1 - (embedding <=> $1::vector) AS similarity
                FROM syllabus_chunks
                WHERE grade <= $2 AND subject = $3
                ORDER BY embedding <=> $1::vector
                LIMIT $4;
            `;
            const result = await this.pool.query(query, [pgVectorStr, grade, subject, limit]);

            this.logger.debug(
                `Found ${result.rows.length} relevant syllabus chunks via RAG similarity for grade=${grade}, subject=${subject}`,
            );
            return result.rows;
        } catch (error) {
            this.logger.warn(`RAG search failed (maybe pgvector is missing): ${(error as Error).message}`);
            return [];
        }
    }

    async ingestTextbook(fileBuffer: Buffer, grade: number, subject: string, chapter: string): Promise<void> {
        try {
            // Use local require for CommonJS module
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(fileBuffer);
            const text = data.text;

            // Clean and Chunk the text
            const CHUNK_SIZE = 1000;
            let chunkOrder = 1;

            this.logger.log(`Parsed PDF text length: ${text.length}. Starting embedding & ingestion...`);

            for (let i = 0; i < text.length; i += CHUNK_SIZE) {
                const chunkText = text.substring(i, i + CHUNK_SIZE);
                if (chunkText.trim().length < 10) continue; // Skip very small or empty chunks

                const embedding = await this.aiService.generateEmbedding(chunkText);
                const pgVectorStr = '[' + embedding.join(',') + ']';

                await this.pool.query(`
                    INSERT INTO syllabus_chunks (grade, subject, chapter, content, chunk_order, embedding)
                    VALUES ($1, $2, $3, $4, $5, $6::vector)
                `, [grade, subject, chapter, chunkText, chunkOrder++, pgVectorStr]);

            }
            this.logger.log(`Successfully ingested textbook for Grade ${grade}, Subject ${subject}, Chapter ${chapter}`);
        } catch (error) {
            this.logger.error(`Failed to ingest textbook: ${(error as Error).message}`);
            throw new InternalServerErrorException('Failed to process and ingest textbook');
        }
    }
}
