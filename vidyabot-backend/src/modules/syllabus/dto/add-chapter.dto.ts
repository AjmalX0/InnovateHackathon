import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AddChapterDto {
    @IsInt()
    @Min(1)
    @Max(12)
    @Type(() => Number)
    grade: number;

    /** Subject slug e.g. "science" */
    @IsString()
    subject: string;

    /** Chapter slug used internally e.g. "chapter-1-life-processes" */
    @IsString()
    chapter: string;

    /** Human-readable label shown in the UI e.g. "Life Processes" */
    @IsString()
    displayName: string;

    /** Ordering index for the chapter list (default: 0) */
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    order?: number;
}
