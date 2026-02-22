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
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const fs_1 = require("fs");
const path_1 = require("path");
let UploadService = UploadService_1 = class UploadService {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(UploadService_1.name);
    }
    async register(file, dto) {
        if (!file) {
            throw new common_1.InternalServerErrorException('No file received by Multer');
        }
        const { data, error } = await this.supabase.db
            .from('documents')
            .insert({
            student_id: dto.studentId,
            session_id: dto.sessionId ?? null,
            label: dto.label ?? null,
            original_name: file.originalname,
            stored_name: file.filename,
            mime_type: file.mimetype,
            size: file.size,
            path: `/uploads/${file.filename}`,
            status: 'pending',
        })
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        this.logger.log(`Document saved: ${data.id} | ${file.originalname} | ${(file.size / 1024).toFixed(1)} KB`);
        return this.toResponse(data);
    }
    async findOne(documentId) {
        const { data, error } = await this.supabase.db
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(`Document "${documentId}" not found`);
        }
        return this.toResponse(data);
    }
    async findByStudent(studentId) {
        const { data, error } = await this.supabase.db
            .from('documents')
            .select('*')
            .eq('student_id', studentId)
            .order('uploaded_at', { ascending: false });
        if (error)
            throw new Error(error.message);
        return (data ?? []).map((r) => this.toResponse(r));
    }
    async markReady(documentId, summary) {
        const { data, error } = await this.supabase.db
            .from('documents')
            .update({ status: 'ready', summary })
            .eq('id', documentId)
            .select()
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(`Document "${documentId}" not found`);
        }
        return this.toResponse(data);
    }
    async getFilePath(documentId) {
        const { data, error } = await this.supabase.db
            .from('documents')
            .select('stored_name')
            .eq('id', documentId)
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(`Document "${documentId}" not found`);
        }
        const absPath = (0, path_1.join)(process.cwd(), 'uploads', data.stored_name);
        if (!(0, fs_1.existsSync)(absPath)) {
            throw new common_1.NotFoundException(`File for document "${documentId}" missing from disk`);
        }
        return absPath;
    }
    toResponse(row) {
        return {
            documentId: row.id,
            originalName: row.original_name,
            mimeType: row.mime_type,
            size: row.size,
            path: row.path,
            status: row.status,
            summary: row.summary,
            uploadedAt: row.uploaded_at,
        };
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], UploadService);
//# sourceMappingURL=upload.service.js.map