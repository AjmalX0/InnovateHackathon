import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { DatabaseModule } from '../database/database.module';
import { StudentsModule } from '../students/students.module';
import { NotesModule } from '../notes/notes.module';
import { CapabilityModule } from '../capability/capability.module';

@Module({
    imports: [DatabaseModule, StudentsModule, NotesModule, CapabilityModule],
    controllers: [TeachersController],
    providers: [TeachersService],
    exports: [TeachersService],
})
export class TeachersModule { }
