export declare enum AudioFormat {
    WEBM = "webm",
    MP3 = "mp3",
    WAV = "wav",
    OGG = "ogg",
    M4A = "m4a"
}
export declare class TranscribeAudioDto {
    studentId: string;
    format?: AudioFormat;
    sessionId?: string;
}
export declare class TranscriptionResultDto {
    transcriptionId: string;
    transcript: string;
    detectedLanguage: string;
    confidence: number;
    isMock: boolean;
    processingTimeMs: number;
}
