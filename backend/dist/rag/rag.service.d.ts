import { ConfigService } from '@nestjs/config';
import { RagQueryDto } from './dto/rag-query.dto';
export interface RagContext {
    context: string;
    sources: Record<string, any>[];
    scores: number[];
    chunksFound: number;
    query: string;
    grade: number;
}
export declare class RagService {
    private readonly config;
    private readonly logger;
    private readonly http;
    constructor(config: ConfigService);
    query(dto: RagQueryDto): Promise<RagContext>;
    ingest(): Promise<{
        chunksIngested: number;
        filesProcessed: number;
        message: string;
    }>;
    status(): Promise<{
        totalChunks: number;
        status: string;
        embeddingModel: string;
        collectionName: string;
    }>;
}
