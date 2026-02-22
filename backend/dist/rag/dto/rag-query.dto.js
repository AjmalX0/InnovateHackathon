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
exports.RagQueryDto = exports.RagLanguage = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var RagLanguage;
(function (RagLanguage) {
    RagLanguage["MALAYALAM"] = "ml";
    RagLanguage["ENGLISH"] = "en";
    RagLanguage["MANGLISH"] = "mng";
    RagLanguage["AUTO"] = "auto";
})(RagLanguage || (exports.RagLanguage = RagLanguage = {}));
class RagQueryDto {
}
exports.RagQueryDto = RagQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'ഫോട്ടോസിന്തസിസ് എന്താണ്?',
        description: 'Student question — any language (ml / en / Manglish)',
        maxLength: 2000,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], RagQueryDto.prototype, "query", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 7,
        description: 'Student grade 1–12 — used to filter relevant syllabus chunks',
        minimum: 1,
        maximum: 12,
    }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], RagQueryDto.prototype, "grade", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: RagLanguage,
        default: RagLanguage.AUTO,
        description: 'Preferred response language',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RagLanguage),
    __metadata("design:type", String)
], RagQueryDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 5,
        description: 'Number of syllabus chunks to retrieve (1–10)',
        minimum: 1,
        maximum: 10,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], RagQueryDto.prototype, "topK", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'student-uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RagQueryDto.prototype, "studentId", void 0);
//# sourceMappingURL=rag-query.dto.js.map