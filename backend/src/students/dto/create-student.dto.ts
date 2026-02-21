import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Kerala school grades: Class 1–12.
 * Grade 0 = kindergarten / LKG/UKG (for future expansion).
 */
export enum Grade {
  CLASS_1 = 1,
  CLASS_2 = 2,
  CLASS_3 = 3,
  CLASS_4 = 4,
  CLASS_5 = 5,
  CLASS_6 = 6,
  CLASS_7 = 7,
  CLASS_8 = 8,
  CLASS_9 = 9,
  CLASS_10 = 10,
  CLASS_11 = 11,
  CLASS_12 = 12,
}

/**
 * Languages supported by VidyaBot.
 * ml  = Malayalam (primary)
 * en  = English
 * mng = Manglish (Malayalam in English script)
 */
export enum Language {
  MALAYALAM = 'ml',
  ENGLISH = 'en',
  MANGLISH = 'mng',
}

export class CreateStudentDto {
  @ApiProperty({ example: 'Arjun P', description: 'Full name of the student' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: Grade,
    example: Grade.CLASS_7,
    description: 'Current class (1–12)',
  })
  @IsInt()
  @Min(1)
  @Max(12)
  grade: number;

  @ApiProperty({
    enum: Language,
    example: Language.MALAYALAM,
    description: 'Preferred response language',
  })
  @IsEnum(Language)
  language: Language;

  @ApiPropertyOptional({
    example: 'Thiruvananthapuram',
    description: 'District (for localised content)',
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({
    example: ['dyslexia'],
    description: 'Learning needs for adaptive pedagogy',
    type: [String],
  })
  @IsOptional()
  learningNeeds?: string[];
}
