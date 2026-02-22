import {
  Controller,
  Post,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SyllabusService } from './syllabus.service';
import { AddSubjectDto } from './dto/add-subject.dto';
import { AddChapterDto } from './dto/add-chapter.dto';

@Controller('syllabus')
export class SyllabusController {
  constructor(private readonly syllabusService: SyllabusService) {}

  // ─── Catalog: Subject ───────────────────────────────────────────────────

  /**
   * POST /syllabus/catalog/subjects
   * Register a new subject for a grade.
   * This is the primary way to define which subjects exist — before any PDF is uploaded.
   *
   * Body: { grade, subject, displayName }
   */
  @Post('catalog/subjects')
  @HttpCode(HttpStatus.CREATED)
  async addSubject(@Body() dto: AddSubjectDto) {
    const entry = await this.syllabusService.addSubjectToCatalog(dto);
    return {
      message: 'Subject added to catalog',
      id: entry.id,
      grade: entry.grade,
      subject: entry.subject,
      displayName: entry.display_name,
    };
  }

  /**
   * GET /syllabus/catalog/subjects?grade=10
   * Retrieve all registered subjects for a grade from the catalog.
   * Returns full metadata including display names.
   */
  @Get('catalog/subjects')
  async getCatalogSubjects(@Query('grade') gradeStr: string) {
    const grade = parseInt(gradeStr, 10);
    if (isNaN(grade) || grade < 1 || grade > 12) {
      throw new BadRequestException('Valid grade (1-12) query param is required');
    }

    const subjects = await this.syllabusService.getCatalogSubjects(grade);
    return {
      grade,
      total: subjects.length,
      subjects: subjects.map((s) => ({
        id: s.id,
        subject: s.subject,
        displayName: s.display_name,
      })),
    };
  }

  // ─── Catalog: Chapter ───────────────────────────────────────────────────

  /**
   * POST /syllabus/catalog/chapters
   * Register a new chapter under a subject for a grade.
   * Use the `order` field to control the sequence shown to students.
   *
   * Body: { grade, subject, chapter, displayName, order? }
   */
  @Post('catalog/chapters')
  @HttpCode(HttpStatus.CREATED)
  async addChapter(@Body() dto: AddChapterDto) {
    const entry = await this.syllabusService.addChapterToCatalog(dto);
    return {
      message: 'Chapter added to catalog',
      id: entry.id,
      grade: entry.grade,
      subject: entry.subject,
      chapter: entry.chapter,
      displayName: entry.display_name,
      order: entry.chapter_order,
    };
  }

  /**
   * GET /syllabus/catalog/chapters?grade=10&subject=science
   * Retrieve all registered chapters for a grade+subject from the catalog.
   * Returns chapters ordered by `chapter_order` with display names.
   */
  @Get('catalog/chapters')
  async getCatalogChapters(
    @Query('grade') gradeStr: string,
    @Query('subject') subject: string,
  ) {
    if (!subject?.trim()) {
      throw new BadRequestException('subject query param is required');
    }
    const grade = parseInt(gradeStr, 10);
    if (isNaN(grade) || grade < 1 || grade > 12) {
      throw new BadRequestException('Valid grade (1-12) query param is required');
    }

    const chapters = await this.syllabusService.getCatalogChapters(grade, subject.trim());
    return {
      grade,
      subject: subject.trim(),
      total: chapters.length,
      chapters: chapters.map((c) => ({
        id: c.id,
        chapter: c.chapter,
        displayName: c.display_name,
        order: c.chapter_order,
      })),
    };
  }

  // ─── Textbook Upload ────────────────────────────────────────────────────

  /**
   * POST /syllabus/upload-textbook
   * Upload a PDF textbook to be chunked, embedded, and stored for RAG.
   *
   * Form-data fields:
   *   - file     : PDF file (required)
   *   - grade    : number 1-12 (required)
   *   - subject  : string e.g. "science" (required)
   *   - chapter  : string e.g. "chapter-1" (required)
   */
  @Post('upload-textbook')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadTextbook(
    @UploadedFile() file: Express.Multer.File,
    @Body('grade') gradeStr: string,
    @Body('subject') subject: string,
    @Body('chapter') chapter: string,
  ) {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    if (!file.mimetype.includes('pdf')) {
      throw new BadRequestException('Only PDF files are accepted');
    }

    const grade = parseInt(gradeStr, 10);
    if (isNaN(grade) || grade < 1 || grade > 12) {
      throw new BadRequestException('Valid grade (1-12) is required');
    }

    if (!subject?.trim() || !chapter?.trim()) {
      throw new BadRequestException('Subject and chapter are required');
    }

    await this.syllabusService.ingestTextbook(
      file.buffer,
      grade,
      subject.trim(),
      chapter.trim(),
    );

    return {
      message:
        'Textbook uploaded and processed successfully. Chunks are now available for RAG.',
      grade,
      subject: subject.trim(),
      chapter: chapter.trim(),
      fileSizeBytes: file.size,
    };
  }

  /**
   * GET /syllabus/subjects?grade=10
   * List all subjects that have uploaded textbook content for a given grade.
   * Students use this to discover what subjects are available before starting a session.
   */
  @Get('subjects')
  async getSubjects(@Query('grade') gradeStr: string) {
    const grade = parseInt(gradeStr, 10);
    if (isNaN(grade) || grade < 1 || grade > 12) {
      throw new BadRequestException(
        'Valid grade (1-12) query param is required',
      );
    }

    const subjects = await this.syllabusService.getAvailableSubjects(grade);
    return { grade, subjects };
  }

  /**
   * GET /syllabus/chapters?grade=10&subject=science
   * List all chapters available for a given grade + subject.
   * Students use this after selecting a subject to pick which chapter to study.
   */
  @Get('chapters')
  async getChapters(
    @Query('grade') gradeStr: string,
    @Query('subject') subject: string,
  ) {
    if (!subject?.trim()) {
      throw new BadRequestException('subject query param is required');
    }

    const grade = parseInt(gradeStr, 10);
    if (isNaN(grade) || grade < 1 || grade > 12) {
      throw new BadRequestException(
        'Valid grade (1-12) query param is required',
      );
    }

    const chapters = await this.syllabusService.getAvailableChapters(
      grade,
      subject.trim(),
    );
    return { grade, subject: subject.trim(), chapters };
  }

  /**
   * GET /syllabus/chunks?grade=10&subject=science&chapter=chapter-1
   * List all stored chunks for a given grade/subject/chapter.
   * Useful to verify that ingestion worked correctly.
   */
  @Get('chunks')
  async getChunks(
    @Query('grade') gradeStr: string,
    @Query('subject') subject: string,
    @Query('chapter') chapter: string,
  ) {
    if (!subject || !chapter) {
      throw new BadRequestException(
        'subject and chapter query params are required',
      );
    }

    const grade = parseInt(gradeStr, 10);
    if (isNaN(grade) || grade < 1 || grade > 12) {
      throw new BadRequestException(
        'Valid grade (1-12) query param is required',
      );
    }

    const chunks = await this.syllabusService.getChunks(
      grade,
      subject,
      chapter,
    );
    return {
      total: chunks.length,
      grade,
      subject,
      chapter,
      chunks: chunks.map((c) => ({
        id: c.id,
        chunk_order: c.chunk_order,
        content_preview: c.content.substring(0, 100) + '...',
      })),
    };
  }

  /**
   * GET /syllabus/search?query=photosynthesis&grade=10&subject=science&limit=3
   * Perform a RAG semantic search against stored chunks.
   * Useful for debugging RAG quality.
   */
  @Get('search')
  async searchChunks(
    @Query('query') query: string,
    @Query('grade') gradeStr: string,
    @Query('subject') subject: string,
    @Query('limit') limitStr?: string,
  ) {
    if (!query || !subject) {
      throw new BadRequestException(
        'query and subject query params are required',
      );
    }

    const grade = parseInt(gradeStr, 10);
    if (isNaN(grade) || grade < 1 || grade > 12) {
      throw new BadRequestException(
        'Valid grade (1-12) query param is required',
      );
    }

    const limit = limitStr ? parseInt(limitStr, 10) : 3;

    const chunks = await this.syllabusService.searchRelevantChunks(
      query,
      grade,
      subject,
      limit,
    );
    return {
      total: chunks.length,
      query,
      grade,
      subject,
      results: chunks.map((c) => ({
        id: c.id,
        chapter: c.chapter,
        chunk_order: c.chunk_order,
        content: c.content,
      })),
    };
  }
}
