import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { OutputModule } from '../output/output.module';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';

@Module({
  imports: [AgentsModule, OutputModule],
  providers: [OrchestratorService],
  controllers: [OrchestratorController],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
