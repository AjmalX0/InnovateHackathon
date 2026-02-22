import { RagService } from './rag.service';
import { RagQueryDto } from './dto/rag-query.dto';
export declare class RagController {
    private readonly ragService;
    constructor(ragService: RagService);
    query(dto: RagQueryDto): Promise<import("./rag.service").RagContext>;
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
