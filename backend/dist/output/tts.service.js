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
var TtsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TtsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let TtsService = TtsService_1 = class TtsService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(TtsService_1.name);
        this.isMock = this.config.get('tts.mock', true);
        this.apiKey = this.config.get('tts.apiKey', '');
        this.logger.log(`TTS mode: ${this.isMock ? '🟡 MOCK' : '🟢 REAL'}`);
    }
    async synthesize(text, language) {
        if (this.isMock) {
            return {
                audioUrl: null,
                text,
                isMock: true,
                durationMs: Math.round(text.length * 60),
            };
        }
        const langCode = language === 'ml' ? 'ml-IN' :
            language === 'mng' ? 'ml-IN' :
                'en-IN';
        const voiceName = language === 'ml' || language === 'mng'
            ? 'ml-IN-Wavenet-A'
            : 'en-IN-Wavenet-A';
        try {
            const { data } = await axios_1.default.post(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`, {
                input: { text },
                voice: { languageCode: langCode, name: voiceName },
                audioConfig: { audioEncoding: 'MP3' },
            }, { timeout: 15_000 });
            const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
            return {
                audioUrl,
                text,
                isMock: false,
                durationMs: undefined,
            };
        }
        catch (err) {
            this.logger.warn(`TTS call failed, returning mock: ${err.message}`);
            return { audioUrl: null, text, isMock: true };
        }
    }
};
exports.TtsService = TtsService;
exports.TtsService = TtsService = TtsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TtsService);
//# sourceMappingURL=tts.service.js.map