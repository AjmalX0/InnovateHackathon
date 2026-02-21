import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { StudentsModule } from './students/students.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { RagModule } from './rag/rag.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // ── Config ────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    // ── Database (global — injected anywhere) ─────────────
    SupabaseModule,

    // ── Step 1: Input & Data Layer ─────────────────────────
    StudentsModule,
    ChatModule,
    UploadModule,
    TranscriptionModule,

    // ── Step 2: RAG Pipeline ───────────────────────────────
    RagModule,
  ],
})
export class AppModule {}
