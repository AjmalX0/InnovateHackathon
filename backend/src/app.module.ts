import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { StudentsModule } from './students/students.module';
import { NotesModule } from './notes/notes.module';
import { TeacherModule } from './teacher/teacher.module';
import { AiModule } from './ai/ai.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ChatModule,
    StudentsModule,
    NotesModule,
    TeacherModule,
    AiModule,
    NotificationsModule,
  ],
})
export class AppModule { }
