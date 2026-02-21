import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class NotesService {
    private supabase = createClient(
        process.env.SUPABASE_URL as string,
        process.env.SUPABASE_SERVICE_KEY as string,
    );

    async saveNote(studentId: string, note: {
        title: string;
        content: string;
        subject: string;
        grade: number;
        keyPoints: string[];
        source: 'chat' | 'upload' | 'voice';
    }) {
        return this.supabase.from('notes').insert({
            student_id: studentId,
            ...note,
            created_at: new Date().toISOString(),
        });
    }

    async getStudentNotes(studentId: string) {
        return this.supabase.from('notes')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
    }

    async shareNote(noteId: string) {
        const shareToken = Math.random().toString(36).substring(7);
        await this.supabase.from('notes')
            .update({ share_token: shareToken, is_shared: true })
            .eq('id', noteId);
        return { shareToken };
    }

    async getNoteByShareToken(token: string) {
        return this.supabase.from('notes')
            .select('title, content, key_points, subject')
            .eq('share_token', token)
            .single();
    }
}
