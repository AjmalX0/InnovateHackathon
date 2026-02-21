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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let AiService = class AiService {
    httpService;
    configService;
    aiUrl;
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.aiUrl = this.configService.get('AI_SERVICE_URL') || 'http://localhost:8001';
    }
    async chat(payload) {
        try {
            const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.aiUrl}/chat`, payload, { timeout: 30000 }));
            return data;
        }
        catch {
            throw new common_1.HttpException('AI service error', 503);
        }
    }
    async processDocument(file, grade, studentId) {
        const formData = new FormData();
        formData.append('file', new Blob([file.buffer]), file.originalname);
        formData.append('grade', grade.toString());
        formData.append('student_id', studentId);
        const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.aiUrl}/process-document`, formData));
        return data;
    }
    async generateQuiz(noteContent, grade, studentId) {
        const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.aiUrl}/generate-quiz`, {
            note_content: noteContent,
            grade,
            student_id: studentId,
        }));
        return data;
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], AiService);
//# sourceMappingURL=ai.service.js.map