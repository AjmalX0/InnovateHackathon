import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateStudentDto {
    @IsString()
    name: string;

    @IsInt()
    @Min(1)
    @Max(12)
    grade: number;
}
