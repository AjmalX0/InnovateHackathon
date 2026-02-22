import { ConfigService } from '@nestjs/config';
import { TranscribeAudioDto, TranscriptionResultDto } from './dto/transcription.dto';
import { StudentsService } from '../students/students.service';
export declare class TranscriptionService {
    private readonly configService;
    private readonly studentsService;
    private readonly logger;
    private readonly isMock;
    private readonly whisperUrl;
    constructor(configService: ConfigService, studentsService: StudentsService);
    transcribeFile(file: Express.Multer.File, dto: TranscribeAudioDto): Promise<TranscriptionResultDto>;
    private callWhisper;
    private mockTranscript;
    private mapToWhisperLang;
}
