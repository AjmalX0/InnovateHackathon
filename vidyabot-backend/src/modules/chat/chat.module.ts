import { Module } from '@nestjs/common';

import { ChatService } from './chat.service';
import { Message } from './entities/message.entity';
import { CapabilityResponse } from '../capability/entities/capability-response.entity';
import { StudentsModule } from '../students/students.module';
import { CapabilityModule } from '../capability/capability.module';
import { SpeechModule } from '../speech/speech.module';
import { AiModule } from '../ai/ai.module';
import { SyllabusModule } from '../syllabus/syllabus.module';

@Module({
    imports: [
        StudentsModule,
        CapabilityModule,
        SpeechModule,
        AiModule,
        SyllabusModule,
    ],
    providers: [ChatService],
    exports: [ChatService],
})
export class ChatModule { }
