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
var ContentAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentAgentService = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("../llm/llm.service");
const rag_service_1 = require("../rag/rag.service");
let ContentAgentService = ContentAgentService_1 = class ContentAgentService {
    constructor(llm, rag) {
        this.llm = llm;
        this.rag = rag;
        this.logger = new common_1.Logger(ContentAgentService_1.name);
    }
    async answer(input) {
        let ragContext = null;
        try {
            ragContext = await this.rag.query({
                query: input.query,
                grade: input.grade,
                language: input.language,
                topK: 5,
                studentId: input.studentId,
            });
            this.logger.log(`RAG retrieved ${ragContext.chunksFound} chunks for grade ${input.grade}`);
        }
        catch (err) {
            this.logger.warn(`RAG unavailable, answering without context: ${err.message}`);
        }
        const systemPrompt = this.buildSystemPrompt(input.grade, input.language, input.learningNeeds);
        const userMessage = this.buildUserMessage(input.query, ragContext);
        const llmResponse = await this.llm.ask(systemPrompt, userMessage, {
            temperature: 0.35,
            maxTokens: 900,
        });
        return {
            answer: llmResponse,
            ragContext,
            sources: ragContext?.sources ?? [],
        };
    }
    buildSystemPrompt(grade, language, learningNeeds) {
        const gradeDesc = grade <= 5 ? 'primary school' : grade <= 8 ? 'upper primary' : 'high school';
        const langNote = language === 'ml'
            ? 'Reply in Malayalam (മലയാളം) script.'
            : language === 'mng'
                ? 'Reply in Manglish (Malayalam written in English letters).'
                : 'Reply in simple English unless the student used Malayalam.';
        const needsNote = learningNeeds && learningNeeds.length
            ? `The student has these learning needs: ${learningNeeds.join(', ')}. Adjust your explanation accordingly.`
            : '';
        return `You are VidyaBot, a friendly AI tutor for Kerala SCERT ${gradeDesc} students (Grade ${grade}).
You always explain concepts using Kerala examples, local context, and the Kerala syllabus.
${langNote}
${needsNote}

Guidelines:
- Use short paragraphs and bullet points for clarity.
- Give ONE real-world Kerala example per concept.
- If the syllabus context is provided below, BASE your answer on it.
- If the context does not cover the question, answer from general knowledge but note it.
- Never say you are a language model. Stay in the VidyaBot persona.
- Keep your answer concise enough for a student — 150–300 words maximum.`;
    }
    buildUserMessage(query, rag) {
        if (!rag || !rag.context) {
            return `Student question: ${query}`;
        }
        return `--- Kerala SCERT Syllabus Context (Grade ${rag.grade}) ---
${rag.context}
--- End of Context ---

Student question: ${query}`;
    }
};
exports.ContentAgentService = ContentAgentService;
exports.ContentAgentService = ContentAgentService = ContentAgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LlmService,
        rag_service_1.RagService])
], ContentAgentService);
//# sourceMappingURL=content-agent.service.js.map