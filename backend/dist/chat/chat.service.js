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
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const students_service_1 = require("../students/students.service");
const supabase_service_1 = require("../supabase/supabase.service");
const orchestrator_service_1 = require("../orchestrator/orchestrator.service");
const uuid_1 = require("uuid");
let ChatService = ChatService_1 = class ChatService {
    constructor(configService, studentsService, supabase, orchestrator) {
        this.configService = configService;
        this.studentsService = studentsService;
        this.supabase = supabase;
        this.orchestrator = orchestrator;
        this.logger = new common_1.Logger(ChatService_1.name);
    }
    async processMessage(dto) {
        const context = await this.studentsService.getContextProfile(dto.studentId);
        const sessionId = dto.sessionId ?? (0, uuid_1.v4)();
        const cleanContent = this.sanitiseInput(dto.content);
        let aiResponse;
        let orchSources = [];
        try {
            const orchResult = await this.orchestrator.process({
                content: cleanContent,
                studentId: dto.studentId,
                sessionId,
                grade: context.grade,
                language: dto.inputLanguage ?? context.language,
                inputType: dto.type,
                learningNeeds: context.learningNeeds,
                documentId: dto.documentId,
                withTts: false,
            });
            aiResponse = orchResult.answer;
            orchSources = orchResult.sources;
        }
        catch (err) {
            this.logger.error(`Orchestrator failed, falling back to stub: ${err.message}`);
            aiResponse = this.stubAiResponse(cleanContent, context.gradeLabel, dto.type);
        }
        const { data, error } = await this.supabase.db
            .from('chat_messages')
            .insert({
            student_id: dto.studentId,
            session_id: sessionId,
            content: cleanContent,
            type: dto.type,
            input_language: dto.inputLanguage ?? 'auto',
            grade: context.grade,
            grade_label: context.gradeLabel,
            learning_needs: context.learningNeeds,
            document_id: dto.documentId ?? null,
            ai_response: aiResponse,
        })
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        this.logger.log(`[${sessionId}] ${context.gradeLabel} (${context.language}) → "${cleanContent.slice(0, 60)}…"`);
        return {
            messageId: data.id,
            sessionId,
            receivedText: cleanContent,
            studentContext: {
                grade: context.grade,
                gradeLabel: context.gradeLabel,
                language: context.language,
                learningNeeds: context.learningNeeds,
            },
            status: 'ready',
            aiResponse,
            sources: orchSources,
        };
    }
    async getSession(sessionId) {
        const { data, error } = await this.supabase.db
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });
        if (error)
            throw new Error(error.message);
        return (data ?? []).map((r) => this.toMessage(r));
    }
    sanitiseInput(raw) {
        return raw.trim().replace(/\s+/g, ' ');
    }
    stubAiResponse(content, gradeLabel, type) {
        return (`[STUB — ${gradeLabel}] ` +
            `Input received: "${content.slice(0, 80)}" ` +
            `(type: ${type}). ` +
            `Real AI response will be injected in Step 3.`);
    }
    toMessage(row) {
        return {
            id: row.id,
            studentId: row.student_id,
            sessionId: row.session_id,
            content: row.content,
            type: row.type,
            inputLanguage: row.input_language,
            grade: row.grade,
            gradeLabel: row.grade_label,
            learningNeeds: row.learning_needs ?? [],
            documentId: row.document_id,
            aiResponse: row.ai_response,
            timestamp: row.timestamp,
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        students_service_1.StudentsService,
        supabase_service_1.SupabaseService,
        orchestrator_service_1.OrchestratorService])
], ChatService);
//# sourceMappingURL=chat.service.js.map