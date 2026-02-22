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
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const upload_service_1 = require("./upload.service");
const upload_dto_1 = require("./dto/upload.dto");
const multer_config_1 = require("./multer.config");
let UploadController = class UploadController {
    constructor(uploadService) {
        this.uploadService = uploadService;
    }
    uploadDocument(file, dto) {
        return this.uploadService.register(file, dto);
    }
    getDocument(id) {
        return this.uploadService.findOne(id);
    }
    getByStudent(studentId) {
        return this.uploadService.findByStudent(studentId);
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('document'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', multer_config_1.multerConfig)),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload a PDF or image document',
        description: 'Accepts PDF, JPEG, PNG, or WEBP files up to 10 MB. ' +
            'The document is saved to disk and queued for AI processing (OCR + summary) in Step 3.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['file', 'studentId'],
            properties: {
                file: { type: 'string', format: 'binary' },
                studentId: { type: 'string', example: 'uuid-here' },
                sessionId: { type: 'string', example: 'session-uuid' },
                label: { type: 'string', example: 'Chapter 5 Notes' },
            },
        },
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Document registered, pending AI processing.' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_dto_1.UploadDocumentDto]),
    __metadata("design:returntype", void 0)
], UploadController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)('document/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get document metadata & summary',
        description: 'Returns status, metadata, and AI summary (when ready).',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Document UUID' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Document record.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UploadController.prototype, "getDocument", null);
__decorate([
    (0, common_1.Get)('student/:studentId'),
    (0, swagger_1.ApiOperation)({
        summary: "List a student's uploaded documents",
    }),
    (0, swagger_1.ApiParam)({ name: 'studentId', description: 'Student UUID' }),
    (0, swagger_1.ApiOkResponse)({ description: "Array of student's documents." }),
    __param(0, (0, common_1.Param)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UploadController.prototype, "getByStudent", null);
exports.UploadController = UploadController = __decorate([
    (0, swagger_1.ApiTags)('upload'),
    (0, common_1.Controller)('upload'),
    __metadata("design:paramtypes", [upload_service_1.UploadService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map