import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@ApiTags('students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ── POST /students ─────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create student profile',
    description:
      'Register a new student with their grade, preferred language, and optional learning needs.',
  })
  @ApiCreatedResponse({ description: 'Student profile created successfully.' })
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  // ── GET /students ──────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all student profiles' })
  @ApiOkResponse({ description: 'Array of all student profiles.' })
  findAll() {
    return this.studentsService.findAll();
  }

  // ── GET /students/:id ──────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get a student profile by ID' })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  @ApiOkResponse({ description: 'Student profile.' })
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  // ── GET /students/:id/context ──────────────────────────────
  @Get(':id/context')
  @ApiOperation({
    summary: 'Get AI context profile',
    description:
      'Returns grade, language and learning needs used by the LangGraph orchestrator.',
  })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  getContext(@Param('id') id: string) {
    return this.studentsService.getContextProfile(id);
  }

  // ── PATCH /students/:id ────────────────────────────────────
  @Patch(':id')
  @ApiOperation({
    summary: 'Update student profile',
    description: 'Partially update grade, language, or learning needs.',
  })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  // ── DELETE /students/:id ───────────────────────────────────
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a student profile' })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
