
import { StudentsModule } from './modules/students/students.module';
import { TeachingModule } from './modules/teaching/teaching.module';
import { ChatModule } from './modules/chat/chat.module';
import { AiModule } from './modules/ai/ai.module';
import { CapabilityModule } from './modules/capability/capability.module';
import { SyllabusModule } from './modules/syllabus/syllabus.module';
import { SpeechModule } from './modules/speech/speech.module';
import { CacheModule } from './modules/cache/cache.module';
import { VidyabotGateway } from './gateway/vidyabot.gateway';
import { Module } from '@nestjs/common';
import { DatabaseModule } from './modules/database/database.module';
@Module({
  imports: [
    DatabaseModule,
    StudentsModule,
    TeachingModule,
    ChatModule,
    AiModule,
    CapabilityModule,
    SyllabusModule,
    SpeechModule,
    CacheModule,
  ],
  providers: [VidyabotGateway],
})
export class AppModule { }
