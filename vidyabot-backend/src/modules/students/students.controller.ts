import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentProfile } from './entities/student-profile.entity';

@Controller('students')
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createProfile(@Body() dto: CreateStudentDto): Promise<StudentProfile> {
        return this.studentsService.createProfile(dto);
    }

    @Get(':id')
    async getProfile(@Param('id') id: string): Promise<StudentProfile> {
        return this.studentsService.getProfile(id);
    }
}
