import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { DatabaseModule } from '../database/database.module';
import { StudentsModule } from '../students/students.module';
import { ChatModule } from '../chat/chat.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [DatabaseModule, StudentsModule, ChatModule, AiModule],
    controllers: [NotesController],
    providers: [NotesService],
    exports: [NotesService],
})
export class NotesModule { }
