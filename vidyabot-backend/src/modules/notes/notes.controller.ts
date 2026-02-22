import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { NotesService } from './notes.service';
import { GenerateNoteDto } from './dto/generate-note.dto';
import { StudentNote } from './entities/student-note.entity';

@Controller('notes')
export class NotesController {
    constructor(private readonly notesService: NotesService) { }

    @Post('generate/:studentId')
    async generateNote(
        @Param('studentId') studentId: string
    ): Promise<StudentNote> {
        const generateNoteDto: GenerateNoteDto = { studentId };
        return this.notesService.generateNoteForStudent(generateNoteDto);
    }

    @Get(':studentId')
    async getNotesForStudent(@Param('studentId') studentId: string): Promise<StudentNote[]> {
        return this.notesService.getNotesForStudent(studentId);
    }
}
