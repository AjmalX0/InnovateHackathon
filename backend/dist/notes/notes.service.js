"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotesService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
let NotesService = class NotesService {
    supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    async saveNote(studentId, note) {
        return this.supabase.from('notes').insert({
            student_id: studentId,
            ...note,
            created_at: new Date().toISOString(),
        });
    }
    async getStudentNotes(studentId) {
        return this.supabase.from('notes')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
    }
    async shareNote(noteId) {
        const shareToken = Math.random().toString(36).substring(7);
        await this.supabase.from('notes')
            .update({ share_token: shareToken, is_shared: true })
            .eq('id', noteId);
        return { shareToken };
    }
    async getNoteByShareToken(token) {
        return this.supabase.from('notes')
            .select('title, content, key_points, subject')
            .eq('share_token', token)
            .single();
    }
};
exports.NotesService = NotesService;
exports.NotesService = NotesService = __decorate([
    (0, common_1.Injectable)()
], NotesService);
//# sourceMappingURL=notes.service.js.map