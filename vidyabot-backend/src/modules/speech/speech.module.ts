import { Module } from '@nestjs/common';
import { SpeechService } from './speech.service';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [AiModule],
    providers: [SpeechService],
    exports: [SpeechService],
})
export class SpeechModule { }
