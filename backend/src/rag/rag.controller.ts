import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { RagService } from './rag.service';
import { RagQueryDto } from './dto/rag-query.dto';

@ApiTags('rag')
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  // ── POST /rag/query ────────────────────────────────────────
  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query Kerala SCERT syllabus (RAG)',
    description:
      'Embeds the student question, retrieves the most relevant Kerala ' +
      'syllabus chunks from ChromaDB filtered by grade, and returns a ' +
      'formatted context string ready for LLM injection in Step 3.',
  })
  @ApiOkResponse({ description: 'Retrieved context + source metadata + similarity scores.' })
  query(@Body() dto: RagQueryDto) {
    return this.ragService.query(dto);
  }

  // ── POST /rag/ingest ───────────────────────────────────────
  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Re-ingest Kerala SCERT syllabus into ChromaDB',
    description:
      'Clears the vector store and re-ingests all JSON files from ' +
      'ai-service/data/syllabus/. Run after updating syllabus data.',
  })
  @ApiOkResponse({ description: 'Ingest result with chunk count.' })
  ingest() {
    return this.ragService.ingest();
  }

  // ── GET /rag/status ────────────────────────────────────────
  @Get('status')
  @ApiOperation({
    summary: 'Get RAG vector store status',
    description: 'Returns total chunks, embedding model, and collection info.',
  })
  @ApiOkResponse({ description: 'ChromaDB status.' })
  status() {
    return this.ragService.status();
  }
}
