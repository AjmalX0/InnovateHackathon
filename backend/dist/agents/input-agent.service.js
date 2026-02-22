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
var InputAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputAgentService = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("../llm/llm.service");
let InputAgentService = InputAgentService_1 = class InputAgentService {
    constructor(llm) {
        this.llm = llm;
        this.logger = new common_1.Logger(InputAgentService_1.name);
    }
    async normalize(rawText, inputType, language) {
        const cleanedText = rawText.trim().replace(/\s+/g, ' ');
        const ruleIntent = this.ruleBasedIntent(cleanedText);
        if (ruleIntent) {
            return {
                cleanedText,
                intent: ruleIntent,
                detectedLanguage: language ?? 'auto',
                isVoice: inputType === 'voice',
            };
        }
        const systemPrompt = `You are VidyaBot, an AI tutor for Kerala SCERT students (grades 1-12).
Classify the student's message into EXACTLY ONE of these intents:
  • question        — student asks about a subject/topic
  • request_notes   — student asks to generate notes or summary
  • request_quiz    — student asks to generate a quiz or test questions
  • upload_query    — student is asking about an uploaded document/image
  • greeting        — hello, hi, thanks, etc.

Also detect the language:
  • ml    — Malayalam script
  • en    — English
  • mng   — Manglish (Malayalam written in Roman letters)
  • auto  — unclear / mixed

Respond ONLY with valid JSON in this exact shape:
{"intent":"<intent>","language":"<language_code>"}`;
        try {
            const raw = await this.llm.ask(systemPrompt, cleanedText, {
                temperature: 0.0,
                maxTokens: 60,
                jsonMode: true,
            });
            const parsed = JSON.parse(raw);
            return {
                cleanedText,
                intent: parsed.intent ?? 'question',
                detectedLanguage: parsed.language ?? 'auto',
                isVoice: inputType === 'voice',
            };
        }
        catch (err) {
            this.logger.warn(`InputAgent LLM classify failed, defaulting to 'question': ${err.message}`);
            return {
                cleanedText,
                intent: 'question',
                detectedLanguage: language ?? 'auto',
                isVoice: inputType === 'voice',
            };
        }
    }
    ruleBasedIntent(text) {
        const lower = text.toLowerCase();
        const notesTriggers = ['notes', 'summary', 'summarize', 'summarise', 'notes banao', 'notes undakku', 'kuripp'];
        const quizTriggers = ['quiz', 'test', 'questions', 'mcq', 'practice', 'exam', 'tharuka', 'ചോദ്യം', 'pariksha'];
        const greetTriggers = ['hello', 'hi ', 'hey ', 'thanks', 'thank you', 'നമസ്കാരം', 'നന്ദി'];
        if (notesTriggers.some(t => lower.includes(t)))
            return 'request_notes';
        if (quizTriggers.some(t => lower.includes(t)))
            return 'request_quiz';
        if (greetTriggers.some(t => lower.startsWith(t.trim()) || lower === t.trim()))
            return 'greeting';
        return null;
    }
};
exports.InputAgentService = InputAgentService;
exports.InputAgentService = InputAgentService = InputAgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LlmService])
], InputAgentService);
//# sourceMappingURL=input-agent.service.js.map