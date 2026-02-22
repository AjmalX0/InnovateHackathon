import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';

@Controller('quizzes')
export class QuizzesController {
    constructor(private readonly quizzesService: QuizzesService) { }

    @Post('generate/:studentId')
    async generateQuiz(
        @Param('studentId') studentId: string,
        @Body('subject') subject: string,
        @Body('chapter') chapter: string
    ) {
        return this.quizzesService.generateQuiz(studentId, subject, chapter);
    }

    @Get(':quizId')
    async getQuiz(@Param('quizId') quizId: string) {
        return this.quizzesService.getQuiz(quizId);
    }

    @Post(':quizId/submit')
    async submitQuiz(
        @Param('quizId') quizId: string,
        @Body('studentId') studentId: string,
        @Body('answers') answers: { questionId: string, selectedIndex: number }[]
    ) {
        return this.quizzesService.submitQuiz(quizId, studentId, answers);
    }
}
