import { PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';

/**
 * All fields are optional for PATCH updates.
 * e.g., student changes preferred language mid-session.
 */
export class UpdateStudentDto extends PartialType(CreateStudentDto) {}
