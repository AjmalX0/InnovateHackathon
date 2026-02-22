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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const path_1 = require("path");
const uuid_1 = require("uuid");
const transcription_service_1 = require("./transcription.service");
const transcription_dto_1 = require("./dto/transcription.dto");
const audioMulterConfig = {
    storage: (0, multer_1.diskStorage)({
        destination: (0, path_1.join)(process.cwd(), 'uploads', 'audio'),
        filename: (_req, file, cb) => {
            const ext = (0, path_1.extname)(file.originalname).toLowerCase() || '.webm';
            cb(null, `${(0, uuid_1.v4)()}${ext}`);
        },
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
};
let TranscriptionController = class TranscriptionController {
    constructor(transcriptionService) {
        this.transcriptionService = transcriptionService;
    }
    async transcribeAudio(audio, dto) {
        return this.transcriptionService.transcribeFile(audio, dto);
    }
};
exports.TranscriptionController = TranscriptionController;
__decorate([
    (0, common_1.Post)('audio'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('audio', audioMulterConfig)),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Transcribe a voice message (Whisper pipeline)',
        description: 'Accepts an audio file (WEBM, MP3, WAV, OGG, M4A). ' +
            'Returns Malayalam / English transcript using Whisper. ' +
            'Set WHISPER_MOCK=true in .env to get a mock response without a Whisper server.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['audio', 'studentId'],
            properties: {
                audio: { type: 'string', format: 'binary', description: 'Voice recording' },
                studentId: { type: 'string', example: 'uuid-here' },
                format: {
                    type: 'string',
                    enum: ['webm', 'mp3', 'wav', 'ogg', 'm4a'],
                    example: 'webm',
                },
                sessionId: { type: 'string', example: 'session-uuid' },
            },
        },
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Whisper transcription result.' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, transcription_dto_1.TranscribeAudioDto]),
    __metadata("design:returntype", Promise)
], TranscriptionController.prototype, "transcribeAudio", null);
exports.TranscriptionController = TranscriptionController = __decorate([
    (0, swagger_1.ApiTags)('transcription'),
    (0, common_1.Controller)('transcription'),
    __metadata("design:paramtypes", [transcription_service_1.TranscriptionService])
], TranscriptionController);
//# sourceMappingURL=transcription.controller.js.map