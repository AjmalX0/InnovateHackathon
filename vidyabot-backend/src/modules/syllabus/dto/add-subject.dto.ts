import { IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddSubjectDto {
    @IsInt()
    @Min(1)
    @Max(12)
    @Type(() => Number)
    grade: number;

    /** Slug used internally e.g. "science" */
    @IsString()
    subject: string;

    /** Human-readable label shown in the UI e.g. "Science" */
    @IsString()
    displayName: string;
}
