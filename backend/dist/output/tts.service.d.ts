import { ConfigService } from '@nestjs/config';
export interface TtsOutput {
    audioUrl: string | null;
    text: string;
    isMock: boolean;
    durationMs?: number;
}
export declare class TtsService {
    private readonly config;
    private readonly logger;
    private readonly isMock;
    private readonly apiKey;
    constructor(config: ConfigService);
    synthesize(text: string, language: string): Promise<TtsOutput>;
}
