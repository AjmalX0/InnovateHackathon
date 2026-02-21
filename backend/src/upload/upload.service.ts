import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadDocumentDto, UploadResponseDto } from './dto/upload.dto';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';
import { join } from 'path';

interface DocumentRecord {
  documentId: string;
  studentId: string;
  sessionId?: string;
  label?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  status: 'pending' | 'ready' | 'error';
  summary?: string;
  uploadedAt: string;
}

/**
 * UploadService — Step 1 responsibility:
 *   Accept file from Multer → store metadata → return document ID.
 *   In Step 3, the document ID is passed to the AI service for OCR/summary.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly docs = new Map<string, DocumentRecord>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Called after Multer has saved the file to disk.
   * Registers the document and returns a structured response.
   */
  register(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): UploadResponseDto {
    if (!file) {
      throw new InternalServerErrorException('No file received by Multer');
    }

    const documentId = uuidv4();
    const record: DocumentRecord = {
      documentId,
      studentId: dto.studentId,
      sessionId: dto.sessionId,
      label: dto.label,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: `/uploads/${file.filename}`,
      status: 'pending',   // → 'ready' after AI pipeline extracts text
      uploadedAt: new Date().toISOString(),
    };

    this.docs.set(documentId, record);

    this.logger.log(
      `Document registered: ${documentId} | ${file.originalname} | ${file.mimetype} | ${(file.size / 1024).toFixed(1)} KB`,
    );

    return this.toResponse(record);
  }

  findOne(documentId: string): UploadResponseDto {
    const record = this.docs.get(documentId);
    if (!record) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }
    return this.toResponse(record);
  }

  findByStudent(studentId: string): UploadResponseDto[] {
    return Array.from(this.docs.values())
      .filter((d) => d.studentId === studentId)
      .map(this.toResponse);
  }

  /**
   * Called by the AI service (Step 3) when OCR/summary is complete.
   */
  markReady(documentId: string, summary: string): UploadResponseDto {
    const record = this.docs.get(documentId);
    if (!record) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }
    record.status = 'ready';
    record.summary = summary;
    this.docs.set(documentId, record);
    return this.toResponse(record);
  }

  /**
   * Returns the absolute filesystem path for a document.
   * Used by the AI service to read the raw file.
   */
  getFilePath(documentId: string): string {
    const record = this.docs.get(documentId);
    if (!record) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }
    const absPath = join(process.cwd(), 'uploads', record.storedName);
    if (!existsSync(absPath)) {
      throw new NotFoundException(
        `File for document "${documentId}" missing from disk`,
      );
    }
    return absPath;
  }

  private toResponse(r: DocumentRecord): UploadResponseDto {
    return {
      documentId: r.documentId,
      originalName: r.originalName,
      mimeType: r.mimeType,
      size: r.size,
      path: r.path,
      status: r.status,
      summary: r.summary,
      uploadedAt: r.uploadedAt,
    };
  }
}
