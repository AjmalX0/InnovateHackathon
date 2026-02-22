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
exports.OrchestratorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const orchestrator_service_1 = require("./orchestrator.service");
const orchestrate_dto_1 = require("./dto/orchestrate.dto");
const notes_agent_service_1 = require("../agents/notes-agent.service");
const quiz_service_1 = require("../output/quiz.service");
let OrchestratorController = class OrchestratorController {
    constructor(orchestrator, notesAgent, quizService) {
        this.orchestrator = orchestrator;
        this.notesAgent = notesAgent;
        this.quizService = quizService;
    }
    process(dto) {
        return this.orchestrator.process(dto);
    }
    async notes(sessionId, grade, language = 'en') {
        return this.notesAgent.generate(sessionId, parseInt(grade, 10) || 7, language);
    }
    async quiz(body) {
        return this.quizService.generate(body.topic, body.grade, body.language ?? 'en', body.count ?? 5);
    }
};
exports.OrchestratorController = OrchestratorController;
__decorate([
    (0, common_1.Post)('process'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Main agentic pipeline (Input → Orchestrator → Agents → Output)',
        description: 'Sends student input through the full VidyaBot pipeline: ' +
            'input normalization, intent classification, RAG retrieval, ' +
            'LLM answering, grade-adapted pedagogy, and optional TTS.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Full orchestrated response with answer, sources, optional notes/quiz/tts.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [orchestrate_dto_1.OrchestrateDto]),
    __metadata("design:returntype", void 0)
], OrchestratorController.prototype, "process", null);
__decorate([
    (0, common_1.Get)('notes/:sessionId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate study notes for a chat session',
        description: 'Fetches all messages from the session and generates structured notes.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Structured notes with title, summary, key points, and markdown.' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Query)('grade')),
    __param(2, (0, common_1.Query)('language')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OrchestratorController.prototype, "notes", null);
__decorate([
    (0, common_1.Post)('quiz'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate a topic MCQ quiz',
        description: 'Generates 5 Kerala SCERT-syllabus MCQ questions for the given topic and grade.',
    }),
    (0, swagger_1.ApiOkResponse)({ description: 'Quiz with questions, options, answers, and hints.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrchestratorController.prototype, "quiz", null);
exports.OrchestratorController = OrchestratorController = __decorate([
    (0, swagger_1.ApiTags)('orchestrator'),
    (0, common_1.Controller)('orchestrator'),
    __metadata("design:paramtypes", [orchestrator_service_1.OrchestratorService,
        notes_agent_service_1.NotesAgentService,
        quiz_service_1.QuizService])
], OrchestratorController);
//# sourceMappingURL=orchestrator.controller.js.map