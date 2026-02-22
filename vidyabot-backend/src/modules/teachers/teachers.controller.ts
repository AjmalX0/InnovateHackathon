import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TeachersService } from './teachers.service';

@Controller('teachers')
export class TeachersController {
    constructor(private readonly teachersService: TeachersService) { }

    @Post('upload-material')
    @UseInterceptors(FileInterceptor('file'))
    async uploadMaterial(
        @UploadedFile() file: Express.Multer.File,
        @Body('grade') gradeStr: string,
        @Body('subject') subject: string,
        @Body('chapter') chapter: string
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        const grade = parseInt(gradeStr, 10);
        if (isNaN(grade) || !subject || !chapter) {
            throw new BadRequestException('Grade, subject, and chapter are required');
        }

        return this.teachersService.uploadMaterial(grade, subject, chapter, file.buffer, file.mimetype);
    }

    @Get('students/:id/report')
    async getStudentReport(@Param('id') id: string) {
        return this.teachersService.getStudentReport(id);
    }
}
