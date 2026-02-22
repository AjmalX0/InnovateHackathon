import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UploadDocumentDto, UploadResponseDto } from './dto/upload.dto';
import { SupabaseService } from '../supabase/supabase.service';
import { existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async register(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new InternalServerErrorException('No file received by Multer');
    }

    const { data, error } = await this.supabase.db
      .from('documents')
      .insert({
        student_id:    dto.studentId,
        session_id:    dto.sessionId ?? null,
        label:         dto.label ?? null,
        original_name: file.originalname,
        stored_name:   file.filename,
        mime_type:     file.mimetype,
        size:          file.size,
        path:          `/uploads/${file.filename}`,
        status:        'pending',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    this.logger.log(
      `Document saved: ${data.id} | ${file.originalname} | ${(file.size / 1024).toFixed(1)} KB`,
    );

    return this.toResponse(data);
  }

  async findOne(documentId: string): Promise<UploadResponseDto> {
    const { data, error } = await this.supabase.db
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }
    return this.toResponse(data);
  }

  async findByStudent(studentId: string): Promise<UploadResponseDto[]> {
    const { data, error } = await this.supabase.db
      .from('documents')
      .select('*')
      .eq('student_id', studentId)
      .order('uploaded_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => this.toResponse(r));
  }

  /** Called by the AI service (Step 3) when OCR/summary is complete. */
  async markReady(documentId: string, summary: string): Promise<UploadResponseDto> {
    const { data, error } = await this.supabase.db
      .from('documents')
      .update({ status: 'ready', summary })
      .eq('id', documentId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }
    return this.toResponse(data);
  }

  /** Returns absolute filesystem path so the AI service can read the raw file. */
  async getFilePath(documentId: string): Promise<string> {
    const { data, error } = await this.supabase.db
      .from('documents')
      .select('stored_name')
      .eq('id', documentId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }

    const absPath = join(process.cwd(), 'uploads', data.stored_name);
    if (!existsSync(absPath)) {
      throw new NotFoundException(
        `File for document "${documentId}" missing from disk`,
      );
    }
    return absPath;
  }

  private toResponse(row: any): UploadResponseDto {
    return {
      documentId:   row.id,
      originalName: row.original_name,
      mimeType:     row.mime_type,
      size:         row.size,
      path:         row.path,
      status:       row.status,
      summary:      row.summary,
      uploadedAt:   row.uploaded_at,
    };
  }
}
