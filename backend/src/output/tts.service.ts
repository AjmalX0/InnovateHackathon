import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface TtsOutput {
  audioUrl:  string | null;   // URL to audio file (null if mock)
  text:      string;          // the text that was spoken
  isMock:    boolean;
  durationMs?: number;
}

/**
 * TtsService — Step 5
 *
 * When TTS_MOCK=true  → returns a placeholder audioUrl so the
 *                        frontend can show a "play" button without a real file.
 *
 * When TTS_MOCK=false → calls Google Cloud TTS (or any REST TTS API)
 *                        using TTS_API_KEY.  Saves audio to /uploads/tts/
 *                        and returns a public URL.
 *
 * Malayalam (ml) support: Google TTS supports ml-IN out of the box.
 */
@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly isMock:  boolean;
  private readonly apiKey:  string;

  constructor(private readonly config: ConfigService) {
    this.isMock = this.config.get<boolean>('tts.mock', true);
    this.apiKey = this.config.get<string>('tts.apiKey', '');
    this.logger.log(`TTS mode: ${this.isMock ? '🟡 MOCK' : '🟢 REAL'}`);
  }

  async synthesize(text: string, language: string): Promise<TtsOutput> {
    if (this.isMock) {
      return {
        audioUrl:  null,
        text,
        isMock:    true,
        durationMs: Math.round(text.length * 60), // rough estimate
      };
    }

    // Real path — Google Cloud TTS REST API
    const langCode =
      language === 'ml'  ? 'ml-IN' :
      language === 'mng' ? 'ml-IN' :  // Manglish → Malayalam voice
      'en-IN';

    const voiceName =
      language === 'ml' || language === 'mng'
        ? 'ml-IN-Wavenet-A'
        : 'en-IN-Wavenet-A';

    try {
      const { data } = await axios.post(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
        {
          input:      { text },
          voice:      { languageCode: langCode, name: voiceName },
          audioConfig:{ audioEncoding: 'MP3' },
        },
        { timeout: 15_000 },
      );

      // data.audioContent is base64 MP3 — for hackathon, return as data URL
      const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
      return {
        audioUrl,
        text,
        isMock:    false,
        durationMs: undefined,
      };
    } catch (err) {
      this.logger.warn(`TTS call failed, returning mock: ${err.message}`);
      return { audioUrl: null, text, isMock: true };
    }
  }
}
