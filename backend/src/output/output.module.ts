import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { QuizService } from './quiz.service';
import { TtsService } from './tts.service';

@Module({
  imports:   [LlmModule],
  providers: [QuizService, TtsService],
  exports:   [QuizService, TtsService],
})
export class OutputModule {}
