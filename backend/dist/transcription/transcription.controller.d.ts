import { TranscriptionService } from './transcription.service';
import { TranscribeAudioDto } from './dto/transcription.dto';
export declare class TranscriptionController {
    private readonly transcriptionService;
    constructor(transcriptionService: TranscriptionService);
    transcribeAudio(audio: Express.Multer.File, dto: TranscribeAudioDto): Promise<import("./dto/transcription.dto").TranscriptionResultDto>;
}
