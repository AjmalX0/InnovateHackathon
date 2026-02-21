"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
let StudentsService = class StudentsService {
    supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || 'http://localhost:8000', process.env.SUPABASE_SERVICE_KEY || 'key');
    async saveMessage(studentId, payload) {
        return this.supabase.from('session_messages').insert({
            student_id: studentId,
            ...payload,
            created_at: new Date().toISOString(),
        });
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)()
], StudentsService);
//# sourceMappingURL=students.service.js.map