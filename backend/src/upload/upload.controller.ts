import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UploadDocumentDto } from './dto/upload.dto';
import { multerConfig } from './multer.config';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // ── POST /upload/document ──────────────────────────────────
  @Post('document')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a PDF or image document',
    description:
      'Accepts PDF, JPEG, PNG, or WEBP files up to 10 MB. ' +
      'The document is saved to disk and queued for AI processing (OCR + summary) in Step 3.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'studentId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        studentId: { type: 'string', example: 'uuid-here' },
        sessionId: { type: 'string', example: 'session-uuid' },
        label: { type: 'string', example: 'Chapter 5 Notes' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Document registered, pending AI processing.' })
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.uploadService.register(file, dto);
  }

  // ── GET /upload/document/:id ───────────────────────────────
  @Get('document/:id')
  @ApiOperation({
    summary: 'Get document metadata & summary',
    description: 'Returns status, metadata, and AI summary (when ready).',
  })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiOkResponse({ description: 'Document record.' })
  getDocument(@Param('id') id: string) {
    return this.uploadService.findOne(id);
  }

  // ── GET /upload/student/:studentId ─────────────────────────
  @Get('student/:studentId')
  @ApiOperation({
    summary: "List a student's uploaded documents",
  })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  @ApiOkResponse({ description: "Array of student's documents." })
  getByStudent(@Param('studentId') studentId: string) {
    return this.uploadService.findByStudent(studentId);
  }
}
