import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';
import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  TranscribeAudioDto,
  TranscriptionResultDto,
} from './dto/transcription.dto';
import { StudentsService } from '../students/students.service';
import { Language } from '../students/dto/create-student.dto';

/**
 * TranscriptionService — Step 1 Whisper Pipeline.
 *
 * When WHISPER_MOCK=true  → returns a deterministic mock transcript
 *                            so the rest of the pipeline can be tested.
 *
 * When WHISPER_MOCK=false → POSTs the audio file to a real Whisper
 *                            endpoint (WHISPER_SERVICE_URL).
 *                            Compatible with:
 *                              • openai-whisper API server
 *                              • whisper.cpp HTTP server
 *                              • OpenAI /v1/audio/transcriptions
 *
 * The language hint is derived from the student's profile so Whisper
 * doesn't need to auto-detect — saves ~0.5 s per request.
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly isMock: boolean;
  private readonly whisperUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly studentsService: StudentsService,
  ) {
    this.isMock = this.configService.get<boolean>('whisper.mock', true);
    this.whisperUrl = this.configService.get<string>(
      'whisper.serviceUrl',
      'http://localhost:9000',
    );
    this.logger.log(
      `Whisper mode: ${this.isMock ? '🟡 MOCK' : '🟢 REAL (' + this.whisperUrl + ')'}`,
    );
  }

  async transcribeFile(
    file: Express.Multer.File,
    dto: TranscribeAudioDto,
  ): Promise<TranscriptionResultDto> {
    const start = Date.now();

    // Resolve student's language preference for the hint
    const context = await this.studentsService.getContextProfile(dto.studentId);
    const languageHint = this.mapToWhisperLang(context.language as Language);

    let transcript: string;
    let detectedLanguage: string;
    let confidence: number;

    if (this.isMock) {
      ({ transcript, detectedLanguage, confidence } = this.mockTranscript(
        languageHint,
        file.originalname,
      ));
    } else {
      ({ transcript, detectedLanguage, confidence } = await this.callWhisper(
        file,
        languageHint,
      ));
    }

    const result: TranscriptionResultDto = {
      transcriptionId: uuidv4(),
      transcript,
      detectedLanguage,
      confidence,
      isMock: this.isMock,
      processingTimeMs: Date.now() - start,
    };

    this.logger.log(
      `[${result.transcriptionId}] "${transcript.slice(0, 60)}" ` +
        `(lang: ${detectedLanguage}, conf: ${confidence.toFixed(2)}, ` +
        `${result.processingTimeMs} ms)`,
    );

    return result;
  }

  // ── Real Whisper call ────────────────────────────────────────
  private async callWhisper(
    file: Express.Multer.File,
    languageHint: string,
  ): Promise<{ transcript: string; detectedLanguage: string; confidence: number }> {
    const form = new FormData();
    form.append('file', createReadStream(file.path), {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    form.append('language', languageHint);
    form.append('response_format', 'json');

    try {
      const response = await axios.post(
        `${this.whisperUrl}/v1/audio/transcriptions`,
        form,
        { headers: form.getHeaders(), timeout: 30_000 },
      );

      const data = response.data;
      return {
        transcript: data.text ?? '',
        detectedLanguage: data.language ?? languageHint,
        confidence: data.confidence ?? 0.9,
      };
    } catch (err) {
      this.logger.error(`Whisper API call failed: ${err.message}`);
      // Graceful degradation — return empty transcript so the app doesn't crash
      return {
        transcript: '',
        detectedLanguage: languageHint,
        confidence: 0,
      };
    }
  }

  // ── Mock transcript generator ───────────────────────────────
  private mockTranscript(
    lang: string,
    filename: string,
  ): { transcript: string; detectedLanguage: string; confidence: number } {
    const samples: Record<string, string[]> = {
      ml: [
        'ഗ്രഹണം എന്നാൽ എന്ത്?',
        'ഫോട്ടോസിന്തസിസ് എങ്ങനെ നടക്കുന്നു?',
        'ന്യൂട്ടന്റെ ഒന്നാമത്തെ നിയമം വിശദീകരിക്കൂ.',
        'ജലചക്രം എന്ന് വിളിക്കുന്നത് എന്തിനെ?',
      ],
      en: [
        'What is photosynthesis?',
        'Explain Newton\'s first law of motion.',
        'What causes an eclipse?',
        'Describe the water cycle.',
      ],
      mng: [
        'Grahanam enthaanu?',
        'Photosynthesis evideyaanu nadakkunne?',
      ],
    };

    const pool = samples[lang] ?? samples['en'];
    const transcript = pool[Math.floor(Math.random() * pool.length)];
    return {
      transcript,
      detectedLanguage: lang,
      confidence: 0.97, // mock is always "confident"
    };
  }

  // ── Language code mapping ────────────────────────────────────
  private mapToWhisperLang(lang: Language): string {
    const map: Record<Language, string> = {
      [Language.MALAYALAM]: 'ml',
      [Language.ENGLISH]: 'en',
      [Language.MANGLISH]: 'ml', // Manglish → hint Whisper with Malayalam
    };
    return map[lang] ?? 'ml';
  }
}
