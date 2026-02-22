import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { InputAgentService } from './input-agent.service';
import { ContentAgentService } from './content-agent.service';
import { PedagogyAgentService } from './pedagogy-agent.service';
import { NotesAgentService } from './notes-agent.service';

@Module({
  imports: [LlmModule, RagModule, SupabaseModule],
  providers: [
    InputAgentService,
    ContentAgentService,
    PedagogyAgentService,
    NotesAgentService,
  ],
  exports: [
    InputAgentService,
    ContentAgentService,
    PedagogyAgentService,
    NotesAgentService,
  ],
})
export class AgentsModule {}
