import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { OrchestratorService } from './orchestrator.service';
import { OrchestrateDto } from './dto/orchestrate.dto';
import { NotesAgentService } from '../agents/notes-agent.service';
import { QuizService } from '../output/quiz.service';

/**
 * OrchestratorController — Step 3
 *
 * Routes:
 *   POST /orchestrator/process   — main agentic pipeline entry point
 *   GET  /orchestrator/notes/:sessionId — fetch notes for a session
 *   POST /orchestrator/quiz      — generate stand-alone quiz
 */
@ApiTags('orchestrator')
@Controller('orchestrator')
export class OrchestratorController {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly notesAgent:   NotesAgentService,
    private readonly quizService:  QuizService,
  ) {}

  // ── POST /orchestrator/process ────────────────────────────────────────
  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Main agentic pipeline (Input → Orchestrator → Agents → Output)',
    description:
      'Sends student input through the full VidyaBot pipeline: ' +
      'input normalization, intent classification, RAG retrieval, ' +
      'LLM answering, grade-adapted pedagogy, and optional TTS.',
  })
  @ApiOkResponse({ description: 'Full orchestrated response with answer, sources, optional notes/quiz/tts.' })
  process(@Body() dto: OrchestrateDto) {
    return this.orchestrator.process(dto);
  }

  // ── GET /orchestrator/notes/:sessionId ────────────────────────────────
  @Get('notes/:sessionId')
  @ApiOperation({
    summary: 'Generate study notes for a chat session',
    description: 'Fetches all messages from the session and generates structured notes.',
  })
  @ApiOkResponse({ description: 'Structured notes with title, summary, key points, and markdown.' })
  async notes(
    @Param('sessionId') sessionId: string,
    @Query('grade') grade: string,
    @Query('language') language = 'en',
  ) {
    return this.notesAgent.generate(sessionId, parseInt(grade, 10) || 7, language);
  }

  // ── POST /orchestrator/quiz ───────────────────────────────────────────
  @Post('quiz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a topic MCQ quiz',
    description: 'Generates 5 Kerala SCERT-syllabus MCQ questions for the given topic and grade.',
  })
  @ApiOkResponse({ description: 'Quiz with questions, options, answers, and hints.' })
  async quiz(
    @Body() body: { topic: string; grade: number; language?: string; count?: number },
  ) {
    return this.quizService.generate(
      body.topic,
      body.grade,
      body.language ?? 'en',
      body.count    ?? 5,
    );
  }
}
