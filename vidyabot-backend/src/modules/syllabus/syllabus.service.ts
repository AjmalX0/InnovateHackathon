import { Injectable, Logger, Inject, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SyllabusChunk } from './entities/syllabus-chunk.entity';
import { AiService } from '../ai/ai.service';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class SyllabusService {
    private readonly logger = new Logger(SyllabusService.name);

    constructor(
        @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
        private readonly aiService: AiService,
    ) { }

    async getChunks(grade: number, subject: string, chapter: string): Promise<SyllabusChunk[]> {
        const { data, error } = await this.supabase
            .from('syllabus_chunks')
            .select('id, grade, subject, chapter, content, chunk_order')
            .lte('grade', grade)
            .eq('chapter', chapter)
            .eq('subject', subject)
            .order('chunk_order', { ascending: true })
            .limit(3);

        if (error) {
            this.logger.error(`Error fetching chunks: ${error.message}`);
            return [];
        }

        this.logger.debug(
            `Found ${data.length} syllabus chunks for grade=${grade}, subject=${subject}, chapter=${chapter}`,
        );
        return data as SyllabusChunk[];
    }

    async searchRelevantChunks(queryText: string, grade: number, subject: string, limit = 3): Promise<SyllabusChunk[]> {
        try {
            // Generate embedding for the search query
            const queryEmbedding = await this.aiService.generateEmbedding(queryText);

            // Perform Cosine Similarity Search via Supabase RPC Call
            const { data, error } = await this.supabase.rpc('match_syllabus_chunks', {
                query_embedding: queryEmbedding,
                match_grade: grade,
                match_subject: subject,
                match_limit: limit
            });

            if (error) throw error;

            this.logger.debug(
                `Found ${data?.length || 0} relevant syllabus chunks via RAG similarity for grade=${grade}, subject=${subject}`,
            );
            return (data || []) as SyllabusChunk[];
        } catch (error) {
            this.logger.warn(`RAG search failed (make sure match_syllabus_chunks RPC exists): ${(error as Error).message}`);
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

                const { error } = await this.supabase.from('syllabus_chunks').insert({
                    grade,
                    subject,
                    chapter,
                    content: chunkText,
                    chunk_order: chunkOrder++,
                    embedding
                });

                if (error) throw error;
            }
            this.logger.log(`Successfully ingested textbook for Grade ${grade}, Subject ${subject}, Chapter ${chapter}`);
        } catch (error) {
            this.logger.error(`Failed to ingest textbook: ${(error as Error).message}`);
            throw new InternalServerErrorException('Failed to process and ingest textbook');
        }
    }
}
