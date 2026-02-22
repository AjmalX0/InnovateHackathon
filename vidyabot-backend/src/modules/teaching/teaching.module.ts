import { Module } from '@nestjs/common';

import { TeachingService } from './teaching.service';
import { TeachingController } from './teaching.controller';
import { TeachingBlock } from './entities/teaching-block.entity';
import { StudentsModule } from '../students/students.module';
import { CapabilityModule } from '../capability/capability.module';
import { SyllabusModule } from '../syllabus/syllabus.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [
        StudentsModule,
        CapabilityModule,
        SyllabusModule,
        AiModule,
    ],
    controllers: [TeachingController],
    providers: [TeachingService],
    exports: [TeachingService],
})
export class TeachingModule { }
