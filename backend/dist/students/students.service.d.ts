import { CreateStudentDto, Language } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { SupabaseService } from '../supabase/supabase.service';
export interface StudentProfile {
    id: string;
    name: string;
    grade: number;
    language: Language;
    district?: string;
    learningNeeds: string[];
    createdAt: string;
    updatedAt: string;
}
export declare class StudentsService {
    private readonly supabase;
    private readonly logger;
    constructor(supabase: SupabaseService);
    create(dto: CreateStudentDto): Promise<StudentProfile>;
    findAll(): Promise<StudentProfile[]>;
    findOne(id: string): Promise<StudentProfile>;
    update(id: string, dto: UpdateStudentDto): Promise<StudentProfile>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    getContextProfile(id: string): Promise<{
        grade: number;
        language: Language;
        learningNeeds: string[];
        gradeLabel: string;
    }>;
    private toProfile;
}
