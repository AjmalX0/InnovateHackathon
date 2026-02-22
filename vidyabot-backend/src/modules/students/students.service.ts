import { Injectable, NotFoundException, Logger, Inject, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { StudentProfile } from './entities/student-profile.entity';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
    private readonly logger = new Logger(StudentsService.name);

    constructor(
        @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    ) { }

    async createProfile(dto: CreateStudentDto): Promise<StudentProfile> {
        const { data, error } = await this.supabase
            .from('student_profiles')
            .insert({ name: dto.name, grade: dto.grade, capability_score: 50 })
            .select()
            .single();

        if (error) {
            this.logger.error(`Error creating profile: ${error.message}`);
            throw new InternalServerErrorException('Failed to create student profile');
        }

        this.logger.log(`Created student profile: ${data.id} (${data.name})`);
        return data as StudentProfile;
    }

    async getProfile(id: string): Promise<StudentProfile> {
        const { data, error } = await this.supabase
            .from('student_profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new NotFoundException(`Student profile with id ${id} not found`);
        }
        return data as StudentProfile;
    }

    async updateCapabilityScore(id: string, score: number): Promise<void> {
        const newScore = Math.min(100, Math.max(0, score));
        const { error } = await this.supabase
            .from('student_profiles')
            .update({ capability_score: newScore, last_active: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            this.logger.error(`Error updating capability score: ${error.message}`);
        }
    }
}
