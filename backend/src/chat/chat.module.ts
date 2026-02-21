import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { AiModule } from '../ai/ai.module';
import { StudentsModule } from '../students/students.module';

@Module({
    imports: [AiModule, StudentsModule],
    providers: [ChatGateway, ChatService],
})
export class ChatModule { }
