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
var NotesAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotesAgentService = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("../llm/llm.service");
const supabase_service_1 = require("../supabase/supabase.service");
let NotesAgentService = NotesAgentService_1 = class NotesAgentService {
    constructor(llm, supabase) {
        this.llm = llm;
        this.supabase = supabase;
        this.logger = new common_1.Logger(NotesAgentService_1.name);
    }
    async generate(sessionId, grade, language) {
        const { data, error } = await this.supabase.db
            .from('chat_messages')
            .select('content, ai_response, type')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });
        if (error)
            throw new Error(error.message);
        if (!data || data.length === 0) {
            return {
                title: 'Empty Session',
                summary: 'No messages found for this session.',
                keyPoints: [],
                rawMarkdown: '',
            };
        }
        const transcript = data
            .filter((m) => m.ai_response)
            .map((m, i) => `Q${i + 1}: ${m.content}\nA${i + 1}: ${m.ai_response}`)
            .join('\n\n');
        if (!transcript.trim()) {
            return {
                title: 'No Q&A Yet',
                summary: 'AI responses not yet available for this session.',
                keyPoints: [],
                rawMarkdown: '',
            };
        }
        const langNote = language === 'ml' ? 'Write the notes in Malayalam script.' :
            language === 'mng' ? 'Write in Manglish (Malayalam in English letters).' :
                'Write in English.';
        const systemPrompt = `You are VidyaBot. Generate concise study notes for a Grade ${grade} Kerala SCERT student from the Q&A session below.
${langNote}
Output ONLY valid JSON in this exact shape — no markdown fences, no extra text:
{
  "title": "<concise topic title>",
  "summary": "<2–3 sentence overview>",
  "keyPoints": ["<point 1>", "<point 2>", "...up to 8 points"]
}`;
        let parsed;
        try {
            const raw = await this.llm.ask(systemPrompt, transcript, {
                temperature: 0.25,
                maxTokens: 600,
                jsonMode: true,
            });
            parsed = JSON.parse(raw);
        }
        catch (err) {
            this.logger.warn(`NotesAgent parse failed: ${err.message}`);
            parsed = {
                title: 'Study Notes',
                summary: 'Auto-generated from your session.',
                keyPoints: ['Review the session messages for details.'],
            };
        }
        const rawMarkdown = [
            `# ${parsed.title}`,
            '',
            `## Summary`,
            parsed.summary,
            '',
            `## Key Points`,
            ...(parsed.keyPoints ?? []).map((p) => `- ${p}`),
        ].join('\n');
        try {
            await this.supabase.db.from('notes').upsert({
                session_id: sessionId,
                grade,
                language,
                title: parsed.title,
                summary: parsed.summary,
                key_points: parsed.keyPoints,
                raw_markdown: rawMarkdown,
                generated_at: new Date().toISOString(),
            }, { onConflict: 'session_id' });
        }
        catch {
            this.logger.warn('notes table upsert skipped — table may not exist yet');
        }
        return {
            title: parsed.title,
            summary: parsed.summary,
            keyPoints: parsed.keyPoints ?? [],
            rawMarkdown,
        };
    }
};
exports.NotesAgentService = NotesAgentService;
exports.NotesAgentService = NotesAgentService = NotesAgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LlmService,
        supabase_service_1.SupabaseService])
], NotesAgentService);
//# sourceMappingURL=notes-agent.service.js.map