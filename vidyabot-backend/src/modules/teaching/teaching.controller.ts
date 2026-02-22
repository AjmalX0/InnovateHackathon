import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { TeachingService } from './teaching.service';
import { StartSessionDto } from './dto/start-session.dto';

@Controller('teaching')
export class TeachingController {
    constructor(private readonly teachingService: TeachingService) { }

    @Post('session')
    @HttpCode(HttpStatus.OK)
    async startSession(@Body() dto: StartSessionDto) {
        const result = await this.teachingService.startTeachingSession(
            dto.studentId,
            dto.subject,
            dto.chapter,
        );
        return {
            blockId: result.block.id,
            fromCache: result.fromCache,
            content: result.content,
        };
    }
}
