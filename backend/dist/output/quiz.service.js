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
var QuizService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const llm_service_1 = require("../llm/llm.service");
let QuizService = QuizService_1 = class QuizService {
    constructor(llm, config) {
        this.llm = llm;
        this.config = config;
        this.logger = new common_1.Logger(QuizService_1.name);
    }
    async generate(topic, grade, language, count = 5) {
        const langNote = language === 'ml' ? 'Write questions and options in Malayalam script.' :
            language === 'mng' ? 'Write in Manglish (Malayalam in English letters).' :
                'Write in English.';
        const systemPrompt = `You are VidyaBot, an AI tutor for Kerala SCERT Grade ${grade} students.
Generate exactly ${count} multiple-choice quiz questions on: "${topic}".
${langNote}
Questions must match Kerala SCERT Grade ${grade} syllabus difficulty.
Output ONLY valid JSON — no markdown fences:
{
  "topic": "<topic name>",
  "questions": [
    {
      "question": "<question text>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "answer": "<correct option text exactly as in options>",
      "hint": "<one-line hint>"
    }
  ]
}`;
        try {
            const raw = await this.llm.ask(systemPrompt, `Topic: ${topic}, Grade: ${grade}`, {
                temperature: 0.5,
                maxTokens: 900,
                jsonMode: true,
            });
            const parsed = JSON.parse(raw);
            return {
                topic: parsed.topic ?? topic,
                grade,
                questions: parsed.questions ?? [],
            };
        }
        catch (err) {
            this.logger.warn(`QuizService generation failed: ${err.message}`);
            return {
                topic,
                grade,
                questions: [
                    {
                        question: `What is ${topic}?`,
                        options: ['Option A', 'Option B', 'Option C', 'Option D'],
                        answer: 'Option A',
                        hint: 'Refer to your textbook.',
                    },
                ],
            };
        }
    }
};
exports.QuizService = QuizService;
exports.QuizService = QuizService = QuizService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LlmService,
        config_1.ConfigService])
], QuizService);
//# sourceMappingURL=quiz.service.js.map