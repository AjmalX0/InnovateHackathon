import { Module } from '@nestjs/common';

import { SyllabusService } from './syllabus.service';
import { SyllabusChunk } from './entities/syllabus-chunk.entity';
import { SyllabusController } from './syllabus.controller';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [AiModule],
    controllers: [SyllabusController],
    providers: [SyllabusService],
    exports: [SyllabusService],
})
export class SyllabusModule { }
