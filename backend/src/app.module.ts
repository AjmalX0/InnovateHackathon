import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StudentsModule } from './students/students.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { TranscriptionModule } from './transcription/transcription.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // ── Config (available globally via ConfigService) ──────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    // ── Step 1: Input & Data Layer ─────────────────────────
    StudentsModule,       // user profile — grade, language, name
    ChatModule,           // text & voice chat input + WebSocket
    UploadModule,         // PDF / image document upload
    TranscriptionModule,  // Whisper voice→text pipeline
  ],
})
export class AppModule {}
