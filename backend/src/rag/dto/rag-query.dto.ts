import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RagLanguage {
  MALAYALAM = 'ml',
  ENGLISH   = 'en',
  MANGLISH  = 'mng',
  AUTO      = 'auto',
}

export class RagQueryDto {
  @ApiProperty({
    example: 'ഫോട്ടോസിന്തസിസ് എന്താണ്?',
    description: 'Student question — any language (ml / en / Manglish)',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  query: string;

  @ApiProperty({
    example: 7,
    description: 'Student grade 1–12 — used to filter relevant syllabus chunks',
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  grade: number;

  @ApiPropertyOptional({
    enum: RagLanguage,
    default: RagLanguage.AUTO,
    description: 'Preferred response language',
  })
  @IsOptional()
  @IsEnum(RagLanguage)
  language?: RagLanguage;

  @ApiPropertyOptional({
    example: 5,
    description: 'Number of syllabus chunks to retrieve (1–10)',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number;

  @ApiPropertyOptional({ example: 'student-uuid' })
  @IsOptional()
  @IsString()
  studentId?: string;
}
