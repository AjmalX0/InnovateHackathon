import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateStudentDto): Promise<StudentProfile> {
    const { data, error } = await this.supabase.db
      .from('students')
      .insert({
        name: dto.name,
        grade: dto.grade,
        language: dto.language,
        district: dto.district ?? null,
        learning_needs: dto.learningNeeds ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toProfile(data);
  }

  async findAll(): Promise<StudentProfile[]> {
    const { data, error } = await this.supabase.db
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => this.toProfile(r));
  }

  async findOne(id: string): Promise<StudentProfile> {
    const { data, error } = await this.supabase.db
      .from('students')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Student with id "${id}" not found`);
    }
    return this.toProfile(data);
  }

  async update(id: string, dto: UpdateStudentDto): Promise<StudentProfile> {
    await this.findOne(id); // throws 404 if not found

    const { data, error } = await this.supabase.db
      .from('students')
      .update({
        ...(dto.name     !== undefined && { name: dto.name }),
        ...(dto.grade    !== undefined && { grade: dto.grade }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.district !== undefined && { district: dto.district }),
        ...(dto.learningNeeds !== undefined && { learning_needs: dto.learningNeeds }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toProfile(data);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    await this.findOne(id); // throws 404 if not found

    const { error } = await this.supabase.db
      .from('students')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { deleted: true };
  }

  /**
   * Compact profile consumed by the LangGraph orchestrator.
   */
  async getContextProfile(id: string): Promise<{
    grade: number;
    language: Language;
    learningNeeds: string[];
    gradeLabel: string;
  }> {
    const student = await this.findOne(id);
    return {
      grade: student.grade,
      language: student.language,
      learningNeeds: student.learningNeeds,
      gradeLabel: `Class ${student.grade}`,
    };
  }

  private toProfile(row: any): StudentProfile {
    return {
      id: row.id,
      name: row.name,
      grade: row.grade,
      language: row.language as Language,
      district: row.district,
      learningNeeds: row.learning_needs ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
