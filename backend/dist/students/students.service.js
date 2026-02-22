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
var StudentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let StudentsService = StudentsService_1 = class StudentsService {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(StudentsService_1.name);
    }
    async create(dto) {
        const { data, error } = await this.supabase.db
            .from('students')
            .insert({
            name: dto.name,
            grade: dto.grade,
            language: dto.language,
            district: dto.district ?? null,
            learning_needs: dto.learningNeeds ?? [],
        })
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return this.toProfile(data);
    }
    async findAll() {
        const { data, error } = await this.supabase.db
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });
        if (error)
            throw new Error(error.message);
        return (data ?? []).map((r) => this.toProfile(r));
    }
    async findOne(id) {
        const { data, error } = await this.supabase.db
            .from('students')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(`Student with id "${id}" not found`);
        }
        return this.toProfile(data);
    }
    async update(id, dto) {
        await this.findOne(id);
        const { data, error } = await this.supabase.db
            .from('students')
            .update({
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.grade !== undefined && { grade: dto.grade }),
            ...(dto.language !== undefined && { language: dto.language }),
            ...(dto.district !== undefined && { district: dto.district }),
            ...(dto.learningNeeds !== undefined && { learning_needs: dto.learningNeeds }),
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw new Error(error.message);
        return this.toProfile(data);
    }
    async remove(id) {
        await this.findOne(id);
        const { error } = await this.supabase.db
            .from('students')
            .delete()
            .eq('id', id);
        if (error)
            throw new Error(error.message);
        return { deleted: true };
    }
    async getContextProfile(id) {
        const student = await this.findOne(id);
        return {
            grade: student.grade,
            language: student.language,
            learningNeeds: student.learningNeeds,
            gradeLabel: `Class ${student.grade}`,
        };
    }
    toProfile(row) {
        return {
            id: row.id,
            name: row.name,
            grade: row.grade,
            language: row.language,
            district: row.district,
            learningNeeds: row.learning_needs ?? [],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = StudentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], StudentsService);
//# sourceMappingURL=students.service.js.map