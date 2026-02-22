import { IsString, IsUUID } from 'class-validator';

export class StartSessionDto {
    @IsUUID()
    studentId: string;

    @IsString()
    subject: string;

    @IsString()
    chapter: string;
}
