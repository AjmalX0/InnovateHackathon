import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { StudentNote } from './entities/student-note.entity';
import { GenerateNoteDto } from './dto/generate-note.dto';
import { StudentsService } from '../students/students.service';
import { ChatService } from '../chat/chat.service';
import { AiService } from '../ai/ai.service';
import { MessageRole } from '../chat/entities/message.entity';

@Injectable()
export class NotesService {
    private readonly logger = new Logger(NotesService.name);

    constructor(
        @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
        private readonly studentsService: StudentsService,
        private readonly chatService: ChatService,
        private readonly aiService: AiService,
    ) { }

    async generateNoteForStudent(generateNoteDto: GenerateNoteDto): Promise<StudentNote> {
        const { studentId } = generateNoteDto;

        // 1. Check if student exists
        const student = await this.studentsService.getProfile(studentId);

        // 2. Fetch recent chat messages for context
        const recentMessages = await this.chatService.getRecentMessages(studentId, 20);
        if (!recentMessages || recentMessages.length === 0) {
            throw new BadRequestException('Not enough chat history to generate notes');
        }

        // Reverse to get chronological order for the AI prompt
        const chronologicalMessages = [...recentMessages].reverse();

        const chatContent = chronologicalMessages.map(m => ({
            role: m.role,
            content: m.content
        }));

        this.logger.log(`Generating study notes for student ${studentId} using ${chatContent.length} messages`);

        // 3. Call AI Service
        const { topic, content } = await this.aiService.generateStudyNotes(student, chatContent, 'ml');

        // 4. Save to Database
        const { data, error } = await this.supabase
            .from('student_notes')
            .insert({
                student_id: studentId,
                topic,
                content
            })
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to save generated note: ${error.message}`);
            throw new BadRequestException('Failed to save generated note');
        }

        this.logger.log(`Successfully generated and saved note ${data.id} for student ${studentId}`);
        return data as StudentNote;
    }

    async getNotesForStudent(studentId: string): Promise<StudentNote[]> {
        const { data, error } = await this.supabase
            .from('student_notes')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) {
            this.logger.error(`Error fetching notes for student ${studentId}: ${error.message}`);
            return [];
        }

        return data as StudentNote[];
    }
}
