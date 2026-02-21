import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'text',
  VOICE = 'voice',       // audio blob → Whisper pipeline
  DOCUMENT = 'document', // uploaded file → summarisation pipeline
}

export enum InputLanguage {
  MALAYALAM = 'ml',
  ENGLISH = 'en',
  MANGLISH = 'mng',
  AUTO = 'auto', // let the AI detect
}

export class SendMessageDto {
  @ApiProperty({
    example: 'ഗ്രഹണം എന്നാൽ എന്ത്?',
    description: 'The student question in any supported language',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiProperty({
    enum: MessageType,
    example: MessageType.TEXT,
    description: 'Type of input: text | voice | document',
  })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'Student UUID — needed to fetch grade & language context',
  })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({
    enum: InputLanguage,
    example: InputLanguage.AUTO,
    description: 'Language of the input text (auto-detects if omitted)',
  })
  @IsOptional()
  @IsEnum(InputLanguage)
  inputLanguage?: InputLanguage;

  @ApiPropertyOptional({
    example: 'doc-uuid-123',
    description: 'Document ID to attach context from an uploaded file',
  })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({
    example: 'session-uuid-abc',
    description: 'Conversation session ID for memory continuity',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
