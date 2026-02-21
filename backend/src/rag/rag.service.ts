import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { RagQueryDto } from './dto/rag-query.dto';

export interface RagContext {
  context:      string;
  sources:      Record<string, any>[];
  scores:       number[];
  chunksFound:  number;
  query:        string;
  grade:        number;
}

/**
 * RagService — NestJS proxy to the Python AI service RAG endpoints.
 *
 * In Step 3 (Orchestrator), ChatService will call `this.ragService.query()`
 * before every LLM call to ground responses in the Kerala SCERT syllabus.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly http:   AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.get<string>('aiService.url', 'http://localhost:8000');
    this.http = axios.create({ baseURL, timeout: 30_000 });
    this.logger.log(`RAG service proxy → ${baseURL}`);
  }

  // ── Query ──────────────────────────────────────────────────

  async query(dto: RagQueryDto): Promise<RagContext> {
    try {
      const { data } = await this.http.post('/rag/query', {
        query:      dto.query,
        grade:      dto.grade,
        language:   dto.language ?? 'auto',
        top_k:      dto.topK ?? 5,
        student_id: dto.studentId,
      });

      return {
        context:     data.context,
        sources:     data.sources,
        scores:      data.scores,
        chunksFound: data.chunks_found,
        query:       data.query,
        grade:       data.grade,
      };
    } catch (err) {
      this.logger.error(`RAG query failed: ${err.message}`);
      throw new ServiceUnavailableException(
        'AI service unavailable. Ensure the Python service is running on port 8000.',
      );
    }
  }

  // ── Ingest ─────────────────────────────────────────────────

  async ingest(): Promise<{ chunksIngested: number; filesProcessed: number; message: string }> {
    try {
      const { data } = await this.http.post('/rag/ingest');
      return {
        chunksIngested:  data.chunks_ingested,
        filesProcessed:  data.files_processed,
        message:         data.message,
      };
    } catch (err) {
      this.logger.error(`RAG ingest failed: ${err.message}`);
      throw new ServiceUnavailableException('AI service unavailable.');
    }
  }

  // ── Status ─────────────────────────────────────────────────

  async status(): Promise<{
    totalChunks:    number;
    status:         string;
    embeddingModel: string;
    collectionName: string;
  }> {
    try {
      const { data } = await this.http.get('/rag/status');
      return {
        totalChunks:    data.total_chunks,
        status:         data.status,
        embeddingModel: data.embedding_model,
        collectionName: data.collection_name,
      };
    } catch (err) {
      this.logger.error(`RAG status check failed: ${err.message}`);
      throw new ServiceUnavailableException('AI service unavailable.');
    }
  }
}
