export class Quiz {
    id: string;
    student_id: string;
    topic: string;
    created_at: Date;
}

export class QuizQuestion {
    id: string;
    quiz_id: string;
    question_text: string;
    options: string[];
    correct_answer_index: number;
    explanation: string;
}

export class QuizAttempt {
    id: string;
    quiz_id: string;
    student_id: string;
    score: number;
    submitted_at: Date;
}
