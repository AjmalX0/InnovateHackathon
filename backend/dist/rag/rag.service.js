"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RagService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let RagService = RagService_1 = class RagService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(RagService_1.name);
        const baseURL = this.config.get('aiService.url', 'http://localhost:8000');
        this.http = axios_1.default.create({ baseURL, timeout: 30_000 });
        this.logger.log(`RAG service proxy → ${baseURL}`);
    }
    async query(dto) {
        try {
            const { data } = await this.http.post('/rag/query', {
                query: dto.query,
                grade: dto.grade,
                language: dto.language ?? 'auto',
                top_k: dto.topK ?? 5,
                student_id: dto.studentId,
            });
            return {
                context: data.context,
                sources: data.sources,
                scores: data.scores,
                chunksFound: data.chunks_found,
                query: data.query,
                grade: data.grade,
            };
        }
        catch (err) {
            this.logger.error(`RAG query failed: ${err.message}`);
            throw new common_1.ServiceUnavailableException('AI service unavailable. Ensure the Python service is running on port 8000.');
        }
    }
    async ingest() {
        try {
            const { data } = await this.http.post('/rag/ingest');
            return {
                chunksIngested: data.chunks_ingested,
                filesProcessed: data.files_processed,
                message: data.message,
            };
        }
        catch (err) {
            this.logger.error(`RAG ingest failed: ${err.message}`);
            throw new common_1.ServiceUnavailableException('AI service unavailable.');
        }
    }
    async status() {
        try {
            const { data } = await this.http.get('/rag/status');
            return {
                totalChunks: data.total_chunks,
                status: data.status,
                embeddingModel: data.embedding_model,
                collectionName: data.collection_name,
            };
        }
        catch (err) {
            this.logger.error(`RAG status check failed: ${err.message}`);
            throw new common_1.ServiceUnavailableException('AI service unavailable.');
        }
    }
};
exports.RagService = RagService;
exports.RagService = RagService = RagService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RagService);
//# sourceMappingURL=rag.service.js.map