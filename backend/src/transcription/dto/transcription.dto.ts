import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';

export enum AudioFormat {
  WEBM = 'webm',
  MP3 = 'mp3',
  WAV = 'wav',
  OGG = 'ogg',
  M4A = 'm4a',
}

export class TranscribeAudioDto {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'Student UUID — used to hint at language for Whisper',
  })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({
    enum: AudioFormat,
    example: AudioFormat.WEBM,
    description: 'Audio format of the uploaded file',
  })
  @IsOptional()
  @IsEnum(AudioFormat)
  format?: AudioFormat;

  @ApiPropertyOptional({
    example: 'session-uuid-abc',
    description: 'Session to attach the transcription result to',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class TranscriptionResultDto {
  @ApiProperty({ example: 'transcription-uuid' })
  transcriptionId: string;

  @ApiProperty({ example: 'ഗ്രഹണം എന്നാൽ എന്ത്?' })
  transcript: string;

  @ApiProperty({ example: 'ml', description: 'Detected language code' })
  detectedLanguage: string;

  @ApiProperty({ example: 0.95, description: 'Confidence score 0–1' })
  confidence: number;

  @ApiProperty({ example: false, description: 'True if this is a mock result' })
  isMock: boolean;

  @ApiProperty({ example: 340, description: 'Processing time in ms' })
  processingTimeMs: number;
}
