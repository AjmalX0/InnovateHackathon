import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'Student UUID — associates the document with a student profile',
  })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({
    example: 'session-uuid-abc',
    description: 'Chat session to attach this document to',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    example: 'Chapter 5: Photosynthesis',
    description: 'Optional label for the document',
  })
  @IsOptional()
  @IsString()
  label?: string;
}

export class UploadResponseDto {
  @ApiProperty({ example: 'doc-uuid-xyz' })
  documentId: string;

  @ApiProperty({ example: 'Chapter 5 Photosynthesis.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes' })
  size: number;

  @ApiProperty({ example: '/uploads/abc123.pdf' })
  path: string;

  @ApiProperty({ example: 'pending', enum: ['pending', 'ready', 'error'] })
  status: string;

  @ApiPropertyOptional({
    example: 'ഫോട്ടോസിന്തസിസ് സസ്യങ്ങൾ സൂര്യപ്രകാശം ഉപയോഗിച്ച്…',
    description: 'AI summary — populated after Step 3 processing',
  })
  summary?: string;

  @ApiProperty()
  uploadedAt: string;
}
