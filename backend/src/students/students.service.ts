import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateStudentDto, Grade, Language } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * StudentsService — manages student profiles.
 *
 * Currently uses an in-memory store so the app can run without
 * a database during the hackathon. Swap `store` for a Supabase
 * client call (or TypeORM entity) when connecting the DB.
 */
@Injectable()
export class StudentsService {
  // In-memory store — replace with Supabase/TypeORM for production
  private readonly store = new Map<string, StudentProfile>();

  create(dto: CreateStudentDto): StudentProfile {
    const now = new Date().toISOString();
    const student: StudentProfile = {
      id: uuidv4(),
      name: dto.name,
      grade: dto.grade,
      language: dto.language,
      district: dto.district,
      learningNeeds: dto.learningNeeds ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(student.id, student);
    return student;
  }

  findAll(): StudentProfile[] {
    return Array.from(this.store.values());
  }

  findOne(id: string): StudentProfile {
    const student = this.store.get(id);
    if (!student) {
      throw new NotFoundException(`Student with id "${id}" not found`);
    }
    return student;
  }

  update(id: string, dto: UpdateStudentDto): StudentProfile {
    const existing = this.findOne(id);
    const updated: StudentProfile = {
      ...existing,
      ...dto,
      learningNeeds: dto.learningNeeds ?? existing.learningNeeds,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  remove(id: string): { deleted: boolean } {
    this.findOne(id); // throws if not found
    this.store.delete(id);
    return { deleted: true };
  }

  /**
   * Returns a compact profile object used by the AI orchestrator
   * to personalise responses (grade-level, language preference, needs).
   */
  getContextProfile(id: string): {
    grade: number;
    language: Language;
    learningNeeds: string[];
    gradeLabel: string;
  } {
    const student = this.findOne(id);
    return {
      grade: student.grade,
      language: student.language,
      learningNeeds: student.learningNeeds,
      gradeLabel: `Class ${student.grade}`,
    };
  }
}
