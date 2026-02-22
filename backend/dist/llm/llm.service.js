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
var LlmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let LlmService = LlmService_1 = class LlmService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(LlmService_1.name);
        const provider = this.config.get('llm.provider', 'groq');
        const apiKey = this.config.get('llm.apiKey', '');
        this.model = this.config.get('llm.model', 'llama-3.3-70b-versatile');
        this.defaultMaxTokens = this.config.get('llm.maxTokens', 1024);
        const baseURL = provider === 'openai'
            ? 'https://api.openai.com/v1'
            : 'https://api.groq.com/openai/v1';
        this.http = axios_1.default.create({
            baseURL,
            timeout: 60_000,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        this.logger.log(`LLM provider → ${provider} | model → ${this.model}`);
    }
    async chat(messages, opts = {}) {
        const { temperature = 0.4, maxTokens, jsonMode = false } = opts;
        const body = {
            model: this.model,
            messages,
            temperature,
            max_tokens: maxTokens ?? this.defaultMaxTokens,
        };
        if (jsonMode) {
            body.response_format = { type: 'json_object' };
        }
        try {
            const { data } = await this.http.post('/chat/completions', body);
            const choice = data.choices?.[0]?.message?.content ?? '';
            return {
                text: choice,
                model: data.model,
                promptTokens: data.usage?.prompt_tokens ?? 0,
                completionTokens: data.usage?.completion_tokens ?? 0,
            };
        }
        catch (err) {
            const detail = err?.response?.data?.error?.message ?? err.message;
            this.logger.error(`LLM call failed: ${detail}`);
            throw new common_1.ServiceUnavailableException(`LLM service error: ${detail}. Check LLM_API_KEY and LLM_PROVIDER in .env`);
        }
    }
    async ask(systemPrompt, userMessage, opts = {}) {
        const res = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ], opts);
        return res.text.trim();
    }
};
exports.LlmService = LlmService;
exports.LlmService = LlmService = LlmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LlmService);
//# sourceMappingURL=llm.service.js.map