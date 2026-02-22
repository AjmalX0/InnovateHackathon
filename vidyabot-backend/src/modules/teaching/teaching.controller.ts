import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { TeachingService } from './teaching.service';
import { StartSessionDto } from './dto/start-session.dto';

@Controller('teaching')
export class TeachingController {
    constructor(private readonly teachingService: TeachingService) { }

    /**
     * GET /teaching/browse/:studentId
     * Returns all subjects and their chapters available for the student's grade.
     *
     * Step 1 of the student flow — call this to populate the subject/chapter picker UI.
     * Then use POST /teaching/session to start the AI tutor with the chosen subject + chapter.
     *
     * Response example:
     * {
     *   studentId: "uuid",
     *   grade: 10,
     *   subjects: [
     *     { name: "science", chapters: ["chapter-1", "chapter-2"] },
     *     { name: "math",    chapters: ["chapter-1"] }
     *   ]
     * }
     */
    @Get('browse/:studentId')
    async browseContent(@Param('studentId') studentId: string) {
        return this.teachingService.browseContent(studentId);
    }

    /**
     * POST /teaching/session
     * Step 2 — student selects subject + chapter and starts the AI tutor session.
     *
     * Body: { studentId, subject, chapter }
     *
     * The selected subject and chapter are passed directly into the AI prompt so
     * Gemini exclusively teaches the content of that chapter. Nothing else.
     *
     * Response includes:
     *  - session metadata (subject, chapter, grade, fromCache)
     *  - content: { introduction, main_explanation, summary, follow_up_question }
     */
    @Post('session')
    @HttpCode(HttpStatus.OK)
    async startSession(@Body() dto: StartSessionDto) {
        const result = await this.teachingService.startTeachingSession(
            dto.studentId,
            dto.subject,
            dto.chapter,
        );
        return {
            blockId: result.block.id,
            subject: dto.subject,
            chapter: dto.chapter,
            grade: result.block.grade,
            fromCache: result.fromCache,
            content: result.content,
        };
    }
}
