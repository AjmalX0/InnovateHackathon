import { Module } from '@nestjs/common';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [StudentsModule],
  controllers: [TranscriptionController],
  providers: [TranscriptionService],
  exports: [TranscriptionService], // shared with Chat module (voice → text → chat)
})
export class TranscriptionModule {}
