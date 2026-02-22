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
var OrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const input_agent_service_1 = require("../agents/input-agent.service");
const content_agent_service_1 = require("../agents/content-agent.service");
const pedagogy_agent_service_1 = require("../agents/pedagogy-agent.service");
const notes_agent_service_1 = require("../agents/notes-agent.service");
const quiz_service_1 = require("../output/quiz.service");
const tts_service_1 = require("../output/tts.service");
let OrchestratorService = OrchestratorService_1 = class OrchestratorService {
    constructor(inputAgent, contentAgent, pedagogyAgent, notesAgent, quizService, ttsService) {
        this.inputAgent = inputAgent;
        this.contentAgent = contentAgent;
        this.pedagogyAgent = pedagogyAgent;
        this.notesAgent = notesAgent;
        this.quizService = quizService;
        this.ttsService = ttsService;
        this.logger = new common_1.Logger(OrchestratorService_1.name);
    }
    async process(dto) {
        const sessionId = dto.sessionId ?? (0, uuid_1.v4)();
        const language = dto.language ?? 'auto';
        const inputType = dto.inputType ?? 'text';
        const learningNeeds = dto.learningNeeds ?? [];
        this.logger.log(`[${sessionId}] Orchestrating: grade=${dto.grade}, lang=${language}, type=${inputType}`);
        const normalized = await this.inputAgent.normalize(dto.content, inputType, language);
        const effectiveLanguage = normalized.detectedLanguage !== 'auto'
            ? normalized.detectedLanguage
            : (language !== 'auto' ? language : 'en');
        this.logger.log(`[${sessionId}] Intent: ${normalized.intent}, Lang: ${effectiveLanguage}`);
        let answer = '';
        let sources = [];
        let notes;
        let quiz;
        let ragUsed = false;
        let chunksFound = 0;
        switch (normalized.intent) {
            case 'greeting': {
                answer = this.greetingResponse(dto.grade, effectiveLanguage);
                break;
            }
            case 'request_notes': {
                notes = await this.notesAgent.generate(sessionId, dto.grade, effectiveLanguage);
                answer = `📒 Notes generated!\n\n${notes.rawMarkdown}`;
                break;
            }
            case 'request_quiz': {
                const topic = this.extractQuizTopic(normalized.cleanedText) || 'general revision';
                quiz = await this.quizService.generate(topic, dto.grade, effectiveLanguage);
                answer = this.quizToText(quiz);
                break;
            }
            case 'question':
            case 'upload_query':
            default: {
                const contentResult = await this.contentAgent.answer({
                    query: normalized.cleanedText,
                    grade: dto.grade,
                    language: effectiveLanguage,
                    learningNeeds,
                    sessionId,
                    studentId: dto.studentId,
                });
                answer = contentResult.answer;
                sources = contentResult.sources;
                ragUsed = !!contentResult.ragContext;
                chunksFound = contentResult.ragContext?.chunksFound ?? 0;
                if (dto.grade <= 8 || learningNeeds.length) {
                    answer = await this.pedagogyAgent.adapt({
                        rawAnswer: answer,
                        grade: dto.grade,
                        language: effectiveLanguage,
                        learningNeeds,
                    });
                }
                break;
            }
        }
        let tts;
        if (dto.withTts) {
            tts = await this.ttsService.synthesize(answer, effectiveLanguage);
        }
        return {
            sessionId,
            intent: normalized.intent,
            answer,
            language: effectiveLanguage,
            sources,
            notes,
            quiz,
            tts,
            metadata: { ragUsed, pedagogyUsed: dto.grade <= 8 || !!learningNeeds.length, chunksFound },
        };
    }
    greetingResponse(grade, language) {
        if (language === 'ml') {
            return `നമസ്കാരം! ഞാൻ VidyaBot ആണ്. Grade ${grade} Kerala SCERT syllabus-ൽ നിങ്ങളെ സഹായിക്കാൻ ഞാൻ ഇവിടെ ഉണ്ട്. ഏതു subject-ലെ question ആണ്?`;
        }
        if (language === 'mng') {
            return `Namaskaram! Njan VidyaBot aanu. Grade ${grade} Kerala SCERT syllabus-il njangal help cheyyam. Enthu subject question undu?`;
        }
        return `Hi there! I'm VidyaBot, your Grade ${grade} Kerala SCERT tutor. What would you like to learn today?`;
    }
    extractQuizTopic(text) {
        return text
            .replace(/quiz|test|questions|mcq|practice|generate|make|create|tharuka|pariksha/gi, '')
            .replace(/on|about|for|in|of/gi, '')
            .trim();
    }
    quizToText(quiz) {
        const lines = [`📝 **${quiz.topic} Quiz (Grade ${quiz.grade})**\n`];
        quiz.questions.forEach((q, i) => {
            lines.push(`**Q${i + 1}.** ${q.question}`);
            q.options.forEach((opt, oi) => {
                const label = ['A', 'B', 'C', 'D'][oi];
                lines.push(`  ${label}) ${opt}`);
            });
            lines.push(`  ✅ Answer: ${q.answer}`);
            if (q.hint)
                lines.push(`  💡 Hint: ${q.hint}`);
            lines.push('');
        });
        return lines.join('\n');
    }
};
exports.OrchestratorService = OrchestratorService;
exports.OrchestratorService = OrchestratorService = OrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [input_agent_service_1.InputAgentService,
        content_agent_service_1.ContentAgentService,
        pedagogy_agent_service_1.PedagogyAgentService,
        notes_agent_service_1.NotesAgentService,
        quiz_service_1.QuizService,
        tts_service_1.TtsService])
], OrchestratorService);
//# sourceMappingURL=orchestrator.service.js.map