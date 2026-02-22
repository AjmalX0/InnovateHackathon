import {
  Controller,
  Post,
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
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TranscriptionService } from './transcription.service';
import { TranscribeAudioDto } from './dto/transcription.dto';

/** Multer config for audio uploads — store temporarily, then process */
const audioMulterConfig = {
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads', 'audio'),
    filename: (_req: any, file: Express.Multer.File, cb: any) => {
      const ext = extname(file.originalname).toLowerCase() || '.webm';
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max audio
};

@ApiTags('transcription')
@Controller('transcription')
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  // ── POST /transcription/audio ──────────────────────────────
  @Post('audio')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('audio', audioMulterConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Transcribe a voice message (Whisper pipeline)',
    description:
      'Accepts an audio file (WEBM, MP3, WAV, OGG, M4A). ' +
      'Returns Malayalam / English transcript using Whisper. ' +
      'Set WHISPER_MOCK=true in .env to get a mock response without a Whisper server.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio', 'studentId'],
      properties: {
        audio: { type: 'string', format: 'binary', description: 'Voice recording' },
        studentId: { type: 'string', example: 'uuid-here' },
        format: {
          type: 'string',
          enum: ['webm', 'mp3', 'wav', 'ogg', 'm4a'],
          example: 'webm',
        },
        sessionId: { type: 'string', example: 'session-uuid' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Whisper transcription result.' })
  async transcribeAudio(
    @UploadedFile() audio: Express.Multer.File,
    @Body() dto: TranscribeAudioDto,
  ) {
    return this.transcriptionService.transcribeFile(audio, dto);
  }
}
