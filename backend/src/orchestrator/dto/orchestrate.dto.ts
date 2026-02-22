import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsEnum,
  IsOptional,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrchestratorInputType {
  TEXT     = 'text',
  VOICE    = 'voice',
  DOCUMENT = 'document',
  IMAGE    = 'image',
}

export class OrchestrateDto {
  @ApiProperty({ example: 'ഫോട്ടോസിന്തസിസ് എന്താണ്?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;

  @ApiProperty({ example: 'student_uuid' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({ example: 'session_uuid' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ example: 7, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  grade: number;

  @ApiPropertyOptional({ example: 'ml', description: 'ml | en | mng | auto' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ enum: OrchestratorInputType, default: OrchestratorInputType.TEXT })
  @IsOptional()
  @IsEnum(OrchestratorInputType)
  inputType?: OrchestratorInputType;

  @ApiPropertyOptional({ example: ['dyslexia'] })
  @IsOptional()
  @IsArray()
  learningNeeds?: string[];

  @ApiPropertyOptional({ description: 'Uploaded document ID if relevant' })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({ description: 'If true, also generate TTS audio URL' })
  @IsOptional()
  withTts?: boolean;
}
