import { Injectable, Logger, Inject, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SyllabusChunk } from './entities/syllabus-chunk.entity';
import { SubjectCatalog } from './entities/subject-catalog.entity';
import { ChapterCatalog } from './entities/chapter-catalog.entity';
import { AddSubjectDto } from './dto/add-subject.dto';
import { AddChapterDto } from './dto/add-chapter.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class SyllabusService {
    private readonly logger = new Logger(SyllabusService.name);

    constructor(
        @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
        private readonly aiService: AiService,
    ) { }

    // ─── Catalog: Subject Management ────────────────────────────────────────

    async addSubjectToCatalog(dto: AddSubjectDto): Promise<SubjectCatalog> {
        const { data, error } = await this.supabase
            .from('subject_catalog')
            .insert({
                grade: dto.grade,
                subject: dto.subject.trim().toLowerCase(),
                display_name: dto.displayName.trim(),
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new ConflictException(
                    `Subject "${dto.subject}" already exists for grade ${dto.grade}`,
                );
            }
            this.logger.error(`Error adding subject to catalog: ${error.message}`);
            throw new InternalServerErrorException('Failed to add subject');
        }

        this.logger.log(`Added subject to catalog: grade=${dto.grade} subject=${dto.subject}`);
        return data as SubjectCatalog;
    }

    async getCatalogSubjects(grade: number): Promise<SubjectCatalog[]> {
        const { data, error } = await this.supabase
            .from('subject_catalog')
            .select('*')
            .eq('grade', grade)
            .order('display_name', { ascending: true });

        if (error) {
            this.logger.error(`Error fetching catalog subjects: ${error.message}`);
            return [];
        }
        return (data ?? []) as SubjectCatalog[];
    }

    // ─── Catalog: Chapter Management ────────────────────────────────────────

    async addChapterToCatalog(dto: AddChapterDto): Promise<ChapterCatalog> {
        const { data, error } = await this.supabase
            .from('chapter_catalog')
            .insert({
                grade: dto.grade,
                subject: dto.subject.trim().toLowerCase(),
                chapter: dto.chapter.trim().toLowerCase(),
                display_name: dto.displayName.trim(),
                chapter_order: dto.order ?? 0,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new ConflictException(
                    `Chapter "${dto.chapter}" already exists for grade ${dto.grade} subject "${dto.subject}"`,
                );
            }
            this.logger.error(`Error adding chapter to catalog: ${error.message}`);
            throw new InternalServerErrorException('Failed to add chapter');
        }

        this.logger.log(
            `Added chapter to catalog: grade=${dto.grade} subject=${dto.subject} chapter=${dto.chapter}`,
        );
        return data as ChapterCatalog;
    }

    async getCatalogChapters(grade: number, subject: string): Promise<ChapterCatalog[]> {
        const { data, error } = await this.supabase
            .from('chapter_catalog')
            .select('*')
            .eq('grade', grade)
            .eq('subject', subject.toLowerCase())
            .order('chapter_order', { ascending: true });

        if (error) {
            this.logger.error(`Error fetching catalog chapters: ${error.message}`);
            return [];
        }
        return (data ?? []) as ChapterCatalog[];
    }

    // ─── Discovery: merge catalog + syllabus_chunks ──────────────────────────

    /**
     * Returns merged unique subject slugs from both subject_catalog and syllabus_chunks.
     * Catalog entries come first (ordered by display_name), then any extra slugs from chunks.
     */
    async getAvailableSubjects(grade: number): Promise<string[]> {
        const [catalogSubjects, chunksData] = await Promise.all([
            this.getCatalogSubjects(grade),
            this.supabase
                .from('syllabus_chunks')
                .select('subject')
                .eq('grade', grade),
        ]);

        const catalogSlugs = catalogSubjects.map((s) => s.subject);
        const chunkSlugs = chunksData.error
            ? []
            : [...new Set((chunksData.data as { subject: string }[]).map((r) => r.subject))];

        // Catalog entries first, then any extra from chunks not in catalog
        const merged = [
            ...catalogSlugs,
            ...chunkSlugs.filter((s) => !catalogSlugs.includes(s)),
        ];
        this.logger.debug(`getAvailableSubjects grade=${grade}: ${merged.length} subjects`);
        return merged;
    }

    /**
     * Returns merged unique chapter slugs from both chapter_catalog and syllabus_chunks.
     * Catalog entries come first (ordered by chapter_order), then any extra slugs from chunks.
     */
    async getAvailableChapters(grade: number, subject: string): Promise<string[]> {
        const [catalogChapters, chunksData] = await Promise.all([
            this.getCatalogChapters(grade, subject),
            this.supabase
                .from('syllabus_chunks')
                .select('chapter')
                .eq('grade', grade)
                .eq('subject', subject),
        ]);

        const catalogSlugs = catalogChapters.map((c) => c.chapter);
        const chunkSlugs = chunksData.error
            ? []
            : [...new Set((chunksData.data as { chapter: string }[]).map((r) => r.chapter))];

        const merged = [
            ...catalogSlugs,
            ...chunkSlugs.filter((c) => !catalogSlugs.includes(c)),
        ];
        this.logger.debug(
            `getAvailableChapters grade=${grade} subject=${subject}: ${merged.length} chapters`,
        );
        return merged;
    }

    async getChunks(grade: number, subject: string, chapter: string): Promise<SyllabusChunk[]> {
        const { data, error } = await this.supabase
            .from('syllabus_chunks')
            .select('id, grade, subject, chapter, content, chunk_order')
            .eq('grade', grade)
            .eq('subject', subject)
            .eq('chapter', chapter)
            .order('chunk_order', { ascending: true })
            .limit(6);

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

    /**
     * Splits raw text into overlapping sentence-aware chunks.
     * Each chunk is ~CHUNK_SIZE chars; consecutive chunks share OVERLAP chars
     * so a concept that spans a boundary is never split across two embeddings.
     */
    private buildChunks(text: string, chunkSize = 1200, overlap = 200): string[] {
        // Normalise whitespace
        const cleaned = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

        // Split on sentence boundaries (. ! ?) to avoid cutting mid-sentence
        const sentences = cleaned.match(/[^.!?]+[.!?]+['"\)\]]?\s*/g) ?? [cleaned];

        const chunks: string[] = [];
        let current = '';
        let overlapBuffer = '';

        for (const sentence of sentences) {
            if ((current + sentence).length > chunkSize && current.trim().length > 0) {
                chunks.push(current.trim());
                // Start next chunk with the overlap tail of the current chunk
                overlapBuffer = current.slice(-overlap);
                current = overlapBuffer + sentence;
            } else {
                current += sentence;
            }
        }

        if (current.trim().length > 30) {
            chunks.push(current.trim());
        }

        return chunks;
    }

    async ingestTextbook(fileBuffer: Buffer, grade: number, subject: string, chapter: string): Promise<void> {
        try {
            // pdf-parse is a CommonJS module — require() avoids ESM interop issues
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
            const { text } = await pdfParse(fileBuffer);

            // Delete any previous chunks for this exact grade/subject/chapter before re-ingesting
            await this.supabase
                .from('syllabus_chunks')
                .delete()
                .eq('grade', grade)
                .eq('subject', subject)
                .eq('chapter', chapter);

            const chunks = this.buildChunks(text);
            this.logger.log(
                `PDF parsed: ${text.length} chars → ${chunks.length} chunks. Embedding for grade=${grade} subject=${subject} chapter=${chapter}...`,
            );

            for (let i = 0; i < chunks.length; i++) {
                const chunkText = chunks[i];
                // Prepend metadata so the embedding also encodes subject/chapter context
                const textToEmbed = `Grade ${grade} | ${subject} | ${chapter}\n\n${chunkText}`;
                const embedding = await this.aiService.generateEmbedding(textToEmbed);

                const { error } = await this.supabase.from('syllabus_chunks').insert({
                    grade,
                    subject,
                    chapter,
                    content: chunkText,
                    chunk_order: i + 1,
                    embedding,
                });

                if (error) throw error;
            }

            this.logger.log(
                `✅ Ingested ${chunks.length} chunks for grade=${grade} subject=${subject} chapter=${chapter}`,
            );
        } catch (error) {
            this.logger.error(`Failed to ingest textbook: ${(error as Error).message}`);
            throw new InternalServerErrorException('Failed to process and ingest textbook');
        }
    }
}
