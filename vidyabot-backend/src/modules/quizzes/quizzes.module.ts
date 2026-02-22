import { Module } from '@nestjs/common';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { DatabaseModule } from '../database/database.module';
import { StudentsModule } from '../students/students.module';
import { AiModule } from '../ai/ai.module';
import { SyllabusModule } from '../syllabus/syllabus.module';

@Module({
    imports: [DatabaseModule, StudentsModule, AiModule, SyllabusModule],
    controllers: [QuizzesController],
    providers: [QuizzesService],
    exports: [QuizzesService],
})
export class QuizzesModule { }
