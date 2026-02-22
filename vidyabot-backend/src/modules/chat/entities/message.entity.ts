import { StudentProfile } from '../../students/entities/student-profile.entity';

export enum MessageRole {
    STUDENT = 'student',
    TUTOR = 'tutor',
}

export enum InputType {
    VOICE = 'voice',
    TEXT = 'text',
}

export class Message {
    id: string;
    student_id: string;
    student?: StudentProfile;
    role: MessageRole;
    content: string;
    input_type: InputType;
    created_at: Date;
}
