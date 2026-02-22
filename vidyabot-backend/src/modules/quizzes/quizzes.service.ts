import { Injectable, Logger, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { StudentsService } from '../students/students.service';
import { AiService } from '../ai/ai.service';
import { SyllabusService } from '../syllabus/syllabus.service';

@Injectable()
export class QuizzesService {
    private readonly logger = new Logger(QuizzesService.name);

    constructor(
        @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
        private readonly studentsService: StudentsService,
        private readonly aiService: AiService,
        private readonly syllabusService: SyllabusService,
    ) { }

    async generateQuiz(studentId: string, subject: string, chapter: string) {
        const student = await this.studentsService.getProfile(studentId);

        // Fetch context from syllabus
        const chunks = await this.syllabusService.searchRelevantChunks(chapter, student.grade, subject, 3);
        const context = chunks.map(c => c.content).join('\n\n');

        if (!context) {
            throw new BadRequestException('No syllabus content found for this chapter to generate a quiz.');
        }

        // Generate quiz questions
        const questionsJson = await this.aiService.generateQuiz(student, chapter, context, 'ml', 5);

        // Save Quiz
        const { data: quiz, error: quizErr } = await this.supabase
            .from('quizzes')
            .insert({
                student_id: studentId,
                topic: `${subject} - ${chapter}`
            })
            .select()
            .single();

        if (quizErr || !quiz) {
            this.logger.error(`Error saving quiz: ${quizErr?.message}`);
            throw new BadRequestException('Failed to generate quiz');
        }

        // Save Questions
        for (const q of questionsJson) {
            await this.supabase
                .from('quiz_questions')
                .insert({
                    quiz_id: quiz.id,
                    question_text: q.question_text,
                    options: q.options,
                    correct_answer_index: q.correct_answer_index,
                    explanation: q.explanation
                });
        }

        return this.getQuiz(quiz.id);
    }

    async getQuiz(quizId: string) {
        const { data: quiz, error: quizErr } = await this.supabase
            .from('quizzes')
            .select('*')
            .eq('id', quizId)
            .single();

        if (quizErr || !quiz) {
            throw new NotFoundException('Quiz not found');
        }

        const { data: questions, error: qErr } = await this.supabase
            .from('quiz_questions')
            .select('id, question_text, options, explanation') // Exclude correct_answer_index for client
            .eq('quiz_id', quizId);

        return {
            ...quiz,
            questions: questions || []
        };
    }

    async submitQuiz(quizId: string, studentId: string, answers: { questionId: string, selectedIndex: number }[]) {
        const { data: questions, error: qErr } = await this.supabase
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', quizId);

        if (qErr || !questions) {
            throw new NotFoundException('Questions not found for this quiz');
        }

        let correctCount = 0;
        let totalQuestions = questions.length;

        const results = questions.map(q => {
            const studentAnswer = answers.find(a => a.questionId === q.id);
            const isCorrect = studentAnswer && studentAnswer.selectedIndex === q.correct_answer_index;
            if (isCorrect) correctCount++;

            return {
                question_id: q.id,
                is_correct: isCorrect,
                correct_index: q.correct_answer_index,
                student_index: studentAnswer?.selectedIndex ?? -1,
                explanation: q.explanation
            };
        });

        const score = (correctCount / totalQuestions) * 100;

        // Save attempt
        const { data: attempt } = await this.supabase
            .from('quiz_attempts')
            .insert({
                quiz_id: quizId,
                student_id: studentId,
                score
            })
            .select()
            .single();

        // Optional: Update Student Capability Score incrementally
        const student = await this.studentsService.getProfile(studentId);
        const scoreDelta = (score > 70) ? 2 : (score < 40) ? -2 : 0;

        if (scoreDelta !== 0) {
            await this.supabase
                .from('student_profiles')
                .update({ capability_score: Math.max(0, Math.min(100, student.capability_score + scoreDelta)) })
                .eq('id', studentId);
        }

        return {
            attempt_id: attempt?.id,
            score,
            results
        };
    }
}
