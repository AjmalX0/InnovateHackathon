import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { SupabaseService } from '../supabase/supabase.service';

export interface NotesOutput {
  title:       string;
  summary:     string;
  keyPoints:   string[];
  rawMarkdown: string;
}

/**
 * NotesAgent — Step 4/4
 *
 * Auto-generates structured study notes from a chat session.
 *
 * Pipeline:
 *   sessionId → fetch all chat_messages from Supabase
 *             → extract Q&A pairs
 *             → LLM → structured notes (title, summary, key bullets)
 *             → return NotesOutput
 *
 * The structured output is also stored in the `notes` table (Step 5 schema).
 */
@Injectable()
export class NotesAgentService {
  private readonly logger = new Logger(NotesAgentService.name);

  constructor(
    private readonly llm:      LlmService,
    private readonly supabase: SupabaseService,
  ) {}

  async generate(
    sessionId:  string,
    grade:      number,
    language:   string,
  ): Promise<NotesOutput> {
    // 1. Fetch session messages
    const { data, error } = await this.supabase.db
      .from('chat_messages')
      .select('content, ai_response, type')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return {
        title:       'Empty Session',
        summary:     'No messages found for this session.',
        keyPoints:   [],
        rawMarkdown: '',
      };
    }

    // 2. Build transcript
    const transcript = data
      .filter((m) => m.ai_response)
      .map((m, i) => `Q${i + 1}: ${m.content}\nA${i + 1}: ${m.ai_response}`)
      .join('\n\n');

    if (!transcript.trim()) {
      return {
        title:       'No Q&A Yet',
        summary:     'AI responses not yet available for this session.',
        keyPoints:   [],
        rawMarkdown: '',
      };
    }

    // 3. LLM call
    const langNote =
      language === 'ml'  ? 'Write the notes in Malayalam script.' :
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

    let parsed: { title: string; summary: string; keyPoints: string[] };

    try {
      const raw = await this.llm.ask(systemPrompt, transcript, {
        temperature: 0.25,
        maxTokens:   600,
        jsonMode:    true,
      });
      parsed = JSON.parse(raw);
    } catch (err) {
      this.logger.warn(`NotesAgent parse failed: ${err.message}`);
      parsed = {
        title:     'Study Notes',
        summary:   'Auto-generated from your session.',
        keyPoints: ['Review the session messages for details.'],
      };
    }

    // 4. Build markdown string for display / storage
    const rawMarkdown = [
      `# ${parsed.title}`,
      '',
      `## Summary`,
      parsed.summary,
      '',
      `## Key Points`,
      ...(parsed.keyPoints ?? []).map((p) => `- ${p}`),
    ].join('\n');

    // 5. Persist to `notes` table (best-effort — no crash if table absent)
    try {
      await this.supabase.db.from('notes').upsert({
        session_id:   sessionId,
        grade,
        language,
        title:        parsed.title,
        summary:      parsed.summary,
        key_points:   parsed.keyPoints,
        raw_markdown: rawMarkdown,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' });
    } catch {
      this.logger.warn('notes table upsert skipped — table may not exist yet');
    }

    return {
      title:       parsed.title,
      summary:     parsed.summary,
      keyPoints:   parsed.keyPoints ?? [],
      rawMarkdown,
    };
  }
}
