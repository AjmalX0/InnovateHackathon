import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { StudentsService } from '../students/students.service';
import { NotesService } from '../notes/notes.service';
import { CapabilityService } from '../capability/capability.service';

@Injectable()
export class TeachersService {
    private readonly logger = new Logger(TeachersService.name);

    constructor(
        @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
        private readonly studentsService: StudentsService,
        private readonly notesService: NotesService,
        private readonly capabilityService: CapabilityService,
    ) { }

    async uploadMaterial(
        grade: number,
        subject: string,
        chapter: string,
        fileBuffer: Buffer,
        mimetype: string
    ) {
        // Very basic text extraction placeholder
        let extractedText = '';
        if (mimetype === 'text/plain') {
            extractedText = fileBuffer.toString('utf-8');
        } else {
            // Placeholder for PDF or other formats
            extractedText = `Extracted content from ${mimetype} for ${subject} chapter ${chapter}`;
            // If it's a real PDF, we would use pdf-parse or similar
        }

        // Basic chunking: Split by double newline or chunks of 1000 characters
        const chunks = extractedText.split('\n\n').filter(c => c.trim().length > 0);

        let order = 1;
        for (const chunk of chunks) {
            const { error } = await this.supabase
                .from('syllabus_chunks')
                .insert({
                    grade,
                    subject,
                    chapter,
                    content: chunk,
                    chunk_order: order++
                });

            if (error) {
                this.logger.error(`Error saving chunk for ${chapter}: ${error.message}`);
                throw new BadRequestException('Failed to save syllabus material');
            }
        }

        return {
            success: true,
            message: `Successfully processed and saved ${chunks.length} chunks for ${subject}: ${chapter}`
        };
    }

    async getStudentReport(studentId: string) {
        const student = await this.studentsService.getProfile(studentId);

        const { data: gaps, error: gapsErr } = await this.supabase
            .from('knowledge_gaps')
            .select('*')
            .eq('student_id', studentId)
            .order('last_updated', { ascending: false });

        const notes = await this.notesService.getNotesForStudent(studentId);

        return {
            student,
            capability_level: this.capabilityService.getCluster(student.capability_score),
            knowledge_gaps: gaps || [],
            recent_notes: notes.slice(0, 5) // Last 5 notes
        };
    }
}
