import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { StudentsModule } from './students/students.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { RagModule } from './rag/rag.module';
import { LlmModule } from './llm/llm.module';
import { AgentsModule } from './agents/agents.module';
import { OutputModule } from './output/output.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
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
    UploadModule,
    TranscriptionModule,

    // ── Step 2: RAG Pipeline ───────────────────────────────
    RagModule,

    // ── LLM provider (shared) ──────────────────────────────
    LlmModule,

    // ── Step 3: Orchestrator ───────────────────────────────
    OrchestratorModule,

    // ── Step 4: Agents ─────────────────────────────────────
    AgentsModule,

    // ── Step 5: Output Layer ───────────────────────────────
    OutputModule,

    // ── Chat (uses Orchestrator internally) ───────────────
    ChatModule,
  ],
})
export class AppModule {}
