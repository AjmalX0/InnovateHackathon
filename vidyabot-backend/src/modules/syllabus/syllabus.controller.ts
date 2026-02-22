import { Controller, Post, UseInterceptors, UploadedFile, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SyllabusService } from './syllabus.service';

@Controller('syllabus')
export class SyllabusController {
    constructor(private readonly syllabusService: SyllabusService) { }

    @Post('upload-textbook')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('file'))
    async uploadTextbook(
        @UploadedFile() file: Express.Multer.File,
        @Body('grade') gradeStr: string,
        @Body('subject') subject: string,
        @Body('chapter') chapter: string,
    ) {
        if (!file) {
            throw new BadRequestException('PDF file is required');
        }

        const grade = parseInt(gradeStr, 10);
        if (isNaN(grade) || grade < 1 || grade > 12) {
            throw new BadRequestException('Valid grade (1-12) is required');
        }

        if (!subject || !chapter) {
            throw new BadRequestException('Subject and chapter are required');
        }

        await this.syllabusService.ingestTextbook(file.buffer, grade, subject, chapter);

        return {
            message: 'Textbook uploaded and processed successfully. Chunks are now available for RAG.',
            grade,
            subject,
            chapter,
        };
    }
}
