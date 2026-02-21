import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class TeacherService {
    private supabase = createClient(
        process.env.SUPABASE_URL as string,
        process.env.SUPABASE_SERVICE_KEY as string,
    );

    async getClassProgress(teacherId: string) {
        // Get all students under this teacher
        const { data: students } = await this.supabase
            .from('students')
            .select('id, name, grade')
            .eq('teacher_id', teacherId);

        const studentIds = students?.map(s => s.id) || [];

        // Get progress for all students
        const { data: progress } = await this.supabase
            .from('student_progress')
            .select('*')
            .in('student_id', studentIds);

        return { students, progress };
    }

    async getWeakAreaHeatmap(teacherId: string) {
        return this.supabase.rpc('get_class_weak_areas', { teacher_id: teacherId });
    }

    async getStudentAlerts(teacherId: string) {
        return this.supabase
            .from('student_alerts')
            .select('*, students(name, grade)')
            .eq('teacher_id', teacherId)
            .eq('resolved', false)
            .order('created_at', { ascending: false });
    }
}
