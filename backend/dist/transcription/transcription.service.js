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
var TranscriptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const FormData = require("form-data");
const fs_1 = require("fs");
const uuid_1 = require("uuid");
const students_service_1 = require("../students/students.service");
const create_student_dto_1 = require("../students/dto/create-student.dto");
let TranscriptionService = TranscriptionService_1 = class TranscriptionService {
    constructor(configService, studentsService) {
        this.configService = configService;
        this.studentsService = studentsService;
        this.logger = new common_1.Logger(TranscriptionService_1.name);
        this.isMock = this.configService.get('whisper.mock', true);
        this.whisperUrl = this.configService.get('whisper.serviceUrl', 'http://localhost:9000');
        this.logger.log(`Whisper mode: ${this.isMock ? '🟡 MOCK' : '🟢 REAL (' + this.whisperUrl + ')'}`);
    }
    async transcribeFile(file, dto) {
        const start = Date.now();
        const context = await this.studentsService.getContextProfile(dto.studentId);
        const languageHint = this.mapToWhisperLang(context.language);
        let transcript;
        let detectedLanguage;
        let confidence;
        if (this.isMock) {
            ({ transcript, detectedLanguage, confidence } = this.mockTranscript(languageHint, file.originalname));
        }
        else {
            ({ transcript, detectedLanguage, confidence } = await this.callWhisper(file, languageHint));
        }
        const result = {
            transcriptionId: (0, uuid_1.v4)(),
            transcript,
            detectedLanguage,
            confidence,
            isMock: this.isMock,
            processingTimeMs: Date.now() - start,
        };
        this.logger.log(`[${result.transcriptionId}] "${transcript.slice(0, 60)}" ` +
            `(lang: ${detectedLanguage}, conf: ${confidence.toFixed(2)}, ` +
            `${result.processingTimeMs} ms)`);
        return result;
    }
    async callWhisper(file, languageHint) {
        const form = new FormData();
        form.append('file', (0, fs_1.createReadStream)(file.path), {
            filename: file.originalname,
            contentType: file.mimetype,
        });
        form.append('language', languageHint);
        form.append('response_format', 'json');
        try {
            const response = await axios_1.default.post(`${this.whisperUrl}/v1/audio/transcriptions`, form, { headers: form.getHeaders(), timeout: 30_000 });
            const data = response.data;
            return {
                transcript: data.text ?? '',
                detectedLanguage: data.language ?? languageHint,
                confidence: data.confidence ?? 0.9,
            };
        }
        catch (err) {
            this.logger.error(`Whisper API call failed: ${err.message}`);
            return {
                transcript: '',
                detectedLanguage: languageHint,
                confidence: 0,
            };
        }
    }
    mockTranscript(lang, filename) {
        const samples = {
            ml: [
                'ഗ്രഹണം എന്നാൽ എന്ത്?',
                'ഫോട്ടോസിന്തസിസ് എങ്ങനെ നടക്കുന്നു?',
                'ന്യൂട്ടന്റെ ഒന്നാമത്തെ നിയമം വിശദീകരിക്കൂ.',
                'ജലചക്രം എന്ന് വിളിക്കുന്നത് എന്തിനെ?',
            ],
            en: [
                'What is photosynthesis?',
                'Explain Newton\'s first law of motion.',
                'What causes an eclipse?',
                'Describe the water cycle.',
            ],
            mng: [
                'Grahanam enthaanu?',
                'Photosynthesis evideyaanu nadakkunne?',
            ],
        };
        const pool = samples[lang] ?? samples['en'];
        const transcript = pool[Math.floor(Math.random() * pool.length)];
        return {
            transcript,
            detectedLanguage: lang,
            confidence: 0.97,
        };
    }
    mapToWhisperLang(lang) {
        const map = {
            [create_student_dto_1.Language.MALAYALAM]: 'ml',
            [create_student_dto_1.Language.ENGLISH]: 'en',
            [create_student_dto_1.Language.MANGLISH]: 'ml',
        };
        return map[lang] ?? 'ml';
    }
};
exports.TranscriptionService = TranscriptionService;
exports.TranscriptionService = TranscriptionService = TranscriptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        students_service_1.StudentsService])
], TranscriptionService);
//# sourceMappingURL=transcription.service.js.map