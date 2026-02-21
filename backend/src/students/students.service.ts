import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class StudentsService {
    private supabase = createClient(
        process.env.SUPABASE_URL || 'http://localhost:8000',
        process.env.SUPABASE_SERVICE_KEY || 'key',
    );

    async saveMessage(studentId: string, payload: any) {
        return this.supabase.from('session_messages').insert({
            student_id: studentId,
            ...payload,
            created_at: new Date().toISOString(),
        });
    }
}
