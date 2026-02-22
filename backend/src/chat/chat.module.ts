import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { StudentsModule } from '../students/students.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

@Module({
  imports: [StudentsModule, OrchestratorModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
