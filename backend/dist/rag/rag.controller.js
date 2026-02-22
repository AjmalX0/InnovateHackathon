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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rag_service_1 = require("./rag.service");
const rag_query_dto_1 = require("./dto/rag-query.dto");
let RagController = class RagController {
    constructor(ragService) {
        this.ragService = ragService;
    }
    query(dto) {
        return this.ragService.query(dto);
    }
    ingest() {
        return this.ragService.ingest();
    }
    status() {
        return this.ragService.status();
    }
};
exports.RagController = RagController;
__decorate([
    (0, common_1.Post)('query'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Query Kerala SCERT syllabus (RAG)',
        description: 'Embeds the student question, retrieves the most relevant Kerala ' +
            'syllabus chunks from ChromaDB filtered by grade, and returns a ' +
            'formatted context string ready for LLM injection in Step 3.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Retrieved context + source metadata + similarity scores.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [rag_query_dto_1.RagQueryDto]),
    __metadata("design:returntype", void 0)
], RagController.prototype, "query", null);
__decorate([
    (0, common_1.Post)('ingest'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Re-ingest Kerala SCERT syllabus into ChromaDB',
        description: 'Clears the vector store and re-ingests all JSON files from ' +
            'ai-service/data/syllabus/. Run after updating syllabus data.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Ingest result with chunk count.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RagController.prototype, "ingest", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get RAG vector store status',
        description: 'Returns total chunks, embedding model, and collection info.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'ChromaDB status.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RagController.prototype, "status", null);
exports.RagController = RagController = __decorate([
    (0, swagger_1.ApiTags)('rag'),
    (0, common_1.Controller)('rag'),
    __metadata("design:paramtypes", [rag_service_1.RagService])
], RagController);
//# sourceMappingURL=rag.controller.js.map