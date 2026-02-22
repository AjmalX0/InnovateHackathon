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
exports.OrchestrateDto = exports.OrchestratorInputType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var OrchestratorInputType;
(function (OrchestratorInputType) {
    OrchestratorInputType["TEXT"] = "text";
    OrchestratorInputType["VOICE"] = "voice";
    OrchestratorInputType["DOCUMENT"] = "document";
    OrchestratorInputType["IMAGE"] = "image";
})(OrchestratorInputType || (exports.OrchestratorInputType = OrchestratorInputType = {}));
class OrchestrateDto {
}
exports.OrchestrateDto = OrchestrateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ഫോട്ടോസിന്തസിസ് എന്താണ്?' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(4000),
    __metadata("design:type", String)
], OrchestrateDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'student_uuid' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], OrchestrateDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'session_uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OrchestrateDto.prototype, "sessionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 7, minimum: 1, maximum: 12 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], OrchestrateDto.prototype, "grade", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ml', description: 'ml | en | mng | auto' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OrchestrateDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: OrchestratorInputType, default: OrchestratorInputType.TEXT }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(OrchestratorInputType),
    __metadata("design:type", String)
], OrchestrateDto.prototype, "inputType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['dyslexia'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], OrchestrateDto.prototype, "learningNeeds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Uploaded document ID if relevant' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OrchestrateDto.prototype, "documentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'If true, also generate TTS audio URL' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], OrchestrateDto.prototype, "withTts", void 0);
//# sourceMappingURL=orchestrate.dto.js.map