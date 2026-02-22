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
exports.CreateStudentDto = exports.Language = exports.Grade = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var Grade;
(function (Grade) {
    Grade[Grade["CLASS_1"] = 1] = "CLASS_1";
    Grade[Grade["CLASS_2"] = 2] = "CLASS_2";
    Grade[Grade["CLASS_3"] = 3] = "CLASS_3";
    Grade[Grade["CLASS_4"] = 4] = "CLASS_4";
    Grade[Grade["CLASS_5"] = 5] = "CLASS_5";
    Grade[Grade["CLASS_6"] = 6] = "CLASS_6";
    Grade[Grade["CLASS_7"] = 7] = "CLASS_7";
    Grade[Grade["CLASS_8"] = 8] = "CLASS_8";
    Grade[Grade["CLASS_9"] = 9] = "CLASS_9";
    Grade[Grade["CLASS_10"] = 10] = "CLASS_10";
    Grade[Grade["CLASS_11"] = 11] = "CLASS_11";
    Grade[Grade["CLASS_12"] = 12] = "CLASS_12";
})(Grade || (exports.Grade = Grade = {}));
var Language;
(function (Language) {
    Language["MALAYALAM"] = "ml";
    Language["ENGLISH"] = "en";
    Language["MANGLISH"] = "mng";
})(Language || (exports.Language = Language = {}));
class CreateStudentDto {
}
exports.CreateStudentDto = CreateStudentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Arjun P', description: 'Full name of the student' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: Grade,
        example: Grade.CLASS_7,
        description: 'Current class (1–12)',
    }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CreateStudentDto.prototype, "grade", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: Language,
        example: Language.MALAYALAM,
        description: 'Preferred response language',
    }),
    (0, class_validator_1.IsEnum)(Language),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Thiruvananthapuram',
        description: 'District (for localised content)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateStudentDto.prototype, "district", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: ['dyslexia'],
        description: 'Learning needs for adaptive pedagogy',
        type: [String],
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateStudentDto.prototype, "learningNeeds", void 0);
//# sourceMappingURL=create-student.dto.js.map