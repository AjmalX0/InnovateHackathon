import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
export declare class StudentsController {
    private readonly studentsService;
    constructor(studentsService: StudentsService);
    create(dto: CreateStudentDto): Promise<import("./students.service").StudentProfile>;
    findAll(): Promise<import("./students.service").StudentProfile[]>;
    findOne(id: string): Promise<import("./students.service").StudentProfile>;
    getContext(id: string): Promise<{
        grade: number;
        language: import("./dto/create-student.dto").Language;
        learningNeeds: string[];
        gradeLabel: string;
    }>;
    update(id: string, dto: UpdateStudentDto): Promise<import("./students.service").StudentProfile>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
