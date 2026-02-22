import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

/**
 * SpeechService
 *
 * Transcribes audio using Gemini 1.5 Flash's native audio understanding.
 * No whisper.cpp binary or local model required.
 *
 * Supported input: WAV audio buffer (base64-encoded internally before sending).
 */
@Injectable()
export class SpeechService {
    private readonly logger = new Logger(SpeechService.name);

    constructor(private readonly aiService: AiService) {}

    /**
     * Transcribes a WAV audio buffer to text using Gemini.
     * @param audioBuffer  Raw WAV bytes
     * @param language     'ml' (Malayalam, default) or 'en' (English)
     */
    async transcribe(audioBuffer: Buffer, language: 'ml' | 'en' = 'ml'): Promise<string> {
        this.logger.log(`Transcribing ${audioBuffer.length} bytes via Gemini...`);
        return this.aiService.transcribeAudio(audioBuffer, language);
    }
}
