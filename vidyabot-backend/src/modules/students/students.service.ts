import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { StudentProfile } from './entities/student-profile.entity';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
    private readonly logger = new Logger(StudentsService.name);

    constructor(
        @Inject('DATABASE_POOL') private readonly pool: Pool,
    ) { }

    async createProfile(dto: CreateStudentDto): Promise<StudentProfile> {
        const query = `
            INSERT INTO student_profiles (name, grade, capability_score)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result = await this.pool.query(query, [dto.name, dto.grade, 50]);
        const saved = result.rows[0];
        this.logger.log(`Created student profile: ${saved.id} (${saved.name})`);
        return saved;
    }

    async getProfile(id: string): Promise<StudentProfile> {
        const query = `SELECT * FROM student_profiles WHERE id = $1`;
        const result = await this.pool.query(query, [id]);
        const student = result.rows[0];
        if (!student) {
            throw new NotFoundException(`Student profile with id ${id} not found`);
        }
        return student;
    }

    async updateCapabilityScore(id: string, score: number): Promise<void> {
        const query = `
            UPDATE student_profiles
            SET capability_score = $1, last_active = NOW()
            WHERE id = $2
        `;
        await this.pool.query(query, [Math.min(100, Math.max(0, score)), id]);
    }
}
