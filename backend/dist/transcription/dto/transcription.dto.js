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
exports.TranscriptionResultDto = exports.TranscribeAudioDto = exports.AudioFormat = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var AudioFormat;
(function (AudioFormat) {
    AudioFormat["WEBM"] = "webm";
    AudioFormat["MP3"] = "mp3";
    AudioFormat["WAV"] = "wav";
    AudioFormat["OGG"] = "ogg";
    AudioFormat["M4A"] = "m4a";
})(AudioFormat || (exports.AudioFormat = AudioFormat = {}));
class TranscribeAudioDto {
}
exports.TranscribeAudioDto = TranscribeAudioDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        description: 'Student UUID — used to hint at language for Whisper',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TranscribeAudioDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: AudioFormat,
        example: AudioFormat.WEBM,
        description: 'Audio format of the uploaded file',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AudioFormat),
    __metadata("design:type", String)
], TranscribeAudioDto.prototype, "format", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'session-uuid-abc',
        description: 'Session to attach the transcription result to',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TranscribeAudioDto.prototype, "sessionId", void 0);
class TranscriptionResultDto {
}
exports.TranscriptionResultDto = TranscriptionResultDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'transcription-uuid' }),
    __metadata("design:type", String)
], TranscriptionResultDto.prototype, "transcriptionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ഗ്രഹണം എന്നാൽ എന്ത്?' }),
    __metadata("design:type", String)
], TranscriptionResultDto.prototype, "transcript", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ml', description: 'Detected language code' }),
    __metadata("design:type", String)
], TranscriptionResultDto.prototype, "detectedLanguage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.95, description: 'Confidence score 0–1' }),
    __metadata("design:type", Number)
], TranscriptionResultDto.prototype, "confidence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false, description: 'True if this is a mock result' }),
    __metadata("design:type", Boolean)
], TranscriptionResultDto.prototype, "isMock", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 340, description: 'Processing time in ms' }),
    __metadata("design:type", Number)
], TranscriptionResultDto.prototype, "processingTimeMs", void 0);
//# sourceMappingURL=transcription.dto.js.map