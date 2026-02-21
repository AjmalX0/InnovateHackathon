"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
let TeacherService = class TeacherService {
    supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    async getClassProgress(teacherId) {
        const { data: students } = await this.supabase
            .from('students')
            .select('id, name, grade')
            .eq('teacher_id', teacherId);
        const studentIds = students?.map(s => s.id) || [];
        const { data: progress } = await this.supabase
            .from('student_progress')
            .select('*')
            .in('student_id', studentIds);
        return { students, progress };
    }
    async getWeakAreaHeatmap(teacherId) {
        return this.supabase.rpc('get_class_weak_areas', { teacher_id: teacherId });
    }
    async getStudentAlerts(teacherId) {
        return this.supabase
            .from('student_alerts')
            .select('*, students(name, grade)')
            .eq('teacher_id', teacherId)
            .eq('resolved', false)
            .order('created_at', { ascending: false });
    }
};
exports.TeacherService = TeacherService;
exports.TeacherService = TeacherService = __decorate([
    (0, common_1.Injectable)()
], TeacherService);
//# sourceMappingURL=teacher.service.js.map