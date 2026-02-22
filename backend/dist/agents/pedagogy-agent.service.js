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
var PedagogyAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PedagogyAgentService = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("../llm/llm.service");
let PedagogyAgentService = PedagogyAgentService_1 = class PedagogyAgentService {
    constructor(llm) {
        this.llm = llm;
        this.logger = new common_1.Logger(PedagogyAgentService_1.name);
    }
    async adapt(input) {
        const { rawAnswer, grade, language, learningNeeds } = input;
        if (grade >= 9 && !learningNeeds.length) {
            return rawAnswer;
        }
        const levelDesc = grade <= 5
            ? 'a Grade ' + grade + ' primary school child (age ' + (grade + 5) + '). Use very simple words, short sentences, and a fun story or analogy. Avoid all technical jargon.'
            : 'a Grade ' + grade + ' upper primary student. Use simple language but introduce subject terms. One example is enough.';
        const langNote = language === 'ml' ? 'Write the adapted answer in Malayalam script.' :
            language === 'mng' ? 'Write in Manglish (Malayalam in English letters).' :
                'Write in simple English.';
        const needsNote = learningNeeds.length
            ? `Extra note — student has: ${learningNeeds.join(', ')}. Make the explanation extra clear and patient.`
            : '';
        const prompt = `You are a compassionate Kerala SCERT teacher.
Rewrite the answer below so it is perfectly understood by ${levelDesc}
${langNote}
${needsNote}
Do NOT add new information. Only simplify the existing answer.
Keep bullet points if present. Max 200 words.`;
        try {
            const adapted = await this.llm.ask(prompt, rawAnswer, {
                temperature: 0.3,
                maxTokens: 500,
            });
            return adapted;
        }
        catch (err) {
            this.logger.warn(`PedagogyAgent adaptation failed, returning raw: ${err.message}`);
            return rawAnswer;
        }
    }
};
exports.PedagogyAgentService = PedagogyAgentService;
exports.PedagogyAgentService = PedagogyAgentService = PedagogyAgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LlmService])
], PedagogyAgentService);
//# sourceMappingURL=pedagogy-agent.service.js.map