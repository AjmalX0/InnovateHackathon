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
exports.SendMessageDto = exports.InputLanguage = exports.MessageType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "text";
    MessageType["VOICE"] = "voice";
    MessageType["DOCUMENT"] = "document";
})(MessageType || (exports.MessageType = MessageType = {}));
var InputLanguage;
(function (InputLanguage) {
    InputLanguage["MALAYALAM"] = "ml";
    InputLanguage["ENGLISH"] = "en";
    InputLanguage["MANGLISH"] = "mng";
    InputLanguage["AUTO"] = "auto";
})(InputLanguage || (exports.InputLanguage = InputLanguage = {}));
class SendMessageDto {
}
exports.SendMessageDto = SendMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'ഗ്രഹണം എന്നാൽ എന്ത്?',
        description: 'The student question in any supported language',
        maxLength: 2000,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], SendMessageDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: MessageType,
        example: MessageType.TEXT,
        description: 'Type of input: text | voice | document',
    }),
    (0, class_validator_1.IsEnum)(MessageType),
    __metadata("design:type", String)
], SendMessageDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        description: 'Student UUID — needed to fetch grade & language context',
    }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: InputLanguage,
        example: InputLanguage.AUTO,
        description: 'Language of the input text (auto-detects if omitted)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(InputLanguage),
    __metadata("design:type", String)
], SendMessageDto.prototype, "inputLanguage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'doc-uuid-123',
        description: 'Document ID to attach context from an uploaded file',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "documentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'session-uuid-abc',
        description: 'Conversation session ID for memory continuity',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "sessionId", void 0);
//# sourceMappingURL=send-message.dto.js.map