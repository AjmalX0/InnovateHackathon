import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateNoteDto {
    @IsString()
    @IsNotEmpty()
    studentId: string;
}
