import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import OpenAI from 'openai';
import { StudentProfile } from '../students/entities/student-profile.entity';
import { SyllabusChunk } from '../syllabus/entities/syllabus-chunk.entity';
import { CapabilityCluster } from '../../common/enums/capability-cluster.enum';

export interface TeachingResponse {
    introduction: string;
    main_explanation: string;
    summary: string;
    follow_up_question: string;
}

export interface DoubtResponse {
    answer: string;
    simple_analogy: string;
    encouragement: string;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    /** Groq client — used for all text generation */
    private readonly client: OpenAI;

    /** Google SDK — kept only for 768-dim embeddings (pgvector) and audio inlineData */
    private readonly genAI: GoogleGenerativeAI;
    private readonly embedModel: GenerativeModel;

    private readonly GENERATION_MODEL = 'llama-3.3-70b-versatile';

    constructor() {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            throw new Error('GROQ_API_KEY environment variable is required');
        }
        this.client = new OpenAI({
            baseURL: 'https://api.groq.com/openai/v1',
            apiKey: groqKey,
        });

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required (used for embeddings and audio)');
        }
        this.genAI = new GoogleGenerativeAI(geminiKey);
        this.embedModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    }

    async transcribeAudio(audioBuffer: Buffer, language: 'ml' | 'en' = 'ml'): Promise<string> {
        const languageHint = language === 'ml'
            ? 'The audio is in Malayalam (മലയാളം). Transcribe it exactly as spoken.'
            : 'The audio is in English. Transcribe it exactly as spoken.';

        try {
            // Audio inlineData requires Google's native SDK (not supported via OpenRouter)
            const audioModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await audioModel.generateContent([
                {
                    inlineData: {
                        mimeType: 'audio/wav',
                        data: audioBuffer.toString('base64'),
                    },
                },
                `${languageHint} Return ONLY the transcribed text with no explanations, labels, or punctuation changes.`,
            ]);

            const text = result.response.text().trim();
            this.logger.log(`Audio transcribed via Gemini: "${text.substring(0, 80)}"`);
            return text;
        } catch (error) {
            this.logger.error(`Gemini audio transcription failed: ${(error as Error).message}`);
            throw new InternalServerErrorException('Failed to transcribe audio');
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const result = await this.embedModel.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            this.logger.error(`AI embedding generation failed: ${(error as Error).message}`);
            throw new InternalServerErrorException('Failed to generate embedding');
        }
    }

    /**
     * Robustly parse JSON from LLM output:
     * 1. Strip markdown code fences
     * 2. Extract the first {...} or [...] block
     * 3. Remove bad control characters that break JSON.parse
     */
    private safeParseJSON<T>(raw: string): T {
        // 1. Strip ```json ... ``` or ``` ... ``` fences
        let text = raw
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        // 2. Extract the first JSON object or array
        const objMatch = text.match(/({[\s\S]*})/);   // object
        const arrMatch = text.match(/(\[[\s\S]*\])/); // array
        if (objMatch) text = objMatch[1];
        else if (arrMatch) text = arrMatch[1];

        // 3. Remove unescaped control characters inside JSON strings
        //    Replace literal \t \r \n inside string values with their escape sequences
        text = text.replace(
            /"((?:[^"\\]|\\.)*)"/g,
            (_match, inner: string) =>
                '"' + inner
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t')
                    // strip other control characters (0x00-0x1F except already-escaped)
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') +
                '"',
        );

        return JSON.parse(text) as T;
    }

    private getTeachingTone(cluster: CapabilityCluster): string {
        switch (cluster) {
            case CapabilityCluster.LOW:
                return 'Explain like a story with simple Malayalam words, use examples from daily life. Keep it very simple and engaging. Avoid technical jargon.';
            case CapabilityCluster.MEDIUM:
                return 'Use a structured lesson with headings, key points, and relatable examples. Balance simplicity with accuracy.';
            case CapabilityCluster.HIGH:
                return 'Provide an in-depth conceptual explanation with reasoning, underlying principles, and connections to other topics. Use technical terminology appropriately.';
        }
    }

    private getDoubtTone(cluster: CapabilityCluster): string {
        switch (cluster) {
            case CapabilityCluster.LOW:
                return 'Answer in very simple language, like explaining to a young child. Use everyday analogies.';
            case CapabilityCluster.MEDIUM:
                return 'Answer clearly and concisely with a simple analogy. Confirm their understanding.';
            case CapabilityCluster.HIGH:
                return 'Answer with depth and precision. Include any relevant nuances or deeper connections.';
        }
    }

    async generateTeaching(
        student: StudentProfile,
        syllabusChunks: SyllabusChunk[],
        subject: string,
        chapter: string,
        language: 'ml' | 'en' = 'ml',
        cluster: CapabilityCluster = CapabilityCluster.MEDIUM,
    ): Promise<TeachingResponse> {
        const tone = this.getTeachingTone(cluster);
        const languageInstruction =
            language === 'ml'
                ? 'Respond ENTIRELY in Malayalam (മലയാളം) script. Do not use English except for technical terms that have no Malayalam equivalent.'
                : 'Respond in English.';

        const syllabusContent =
            syllabusChunks.length > 0
                ? syllabusChunks.map((c, i) => `Chunk ${i + 1}:\n${c.content}`).join('\n\n')
                : 'No textbook content available. Use your general knowledge for this chapter.';

        const prompt = `
You are VidyaBot, an expert AI tutor for Kerala school students.

Student Information:
- Name: ${student.name}
- Grade: ${student.grade}
- Capability Level: ${cluster}

Current Lesson:
- Subject: ${subject}
- Chapter: ${chapter}

CRITICAL INSTRUCTION: You must ONLY teach the content of "${chapter}" from the subject "${subject}".
Do NOT drift into other chapters, other subjects, or unrelated topics.
Every sentence you write must be directly about this chapter.

Teaching Style: ${tone}

Language Instruction: ${languageInstruction}

Textbook Content for "${chapter}" (use this as your primary source):
${syllabusContent}

Generate a complete teaching block strictly about "${chapter}". Return a valid JSON object with exactly these fields:
{
  "introduction": "An engaging opening about ${chapter} that grabs the student's attention (2-3 sentences)",
  "main_explanation": "The full lesson for ${chapter} adapted to the student's level — cover all key concepts from the textbook content above",
  "summary": "A brief recap of the key points of ${chapter} (3-5 bullet points)",
  "follow_up_question": "One question specifically about ${chapter} to check the student's understanding"
}

Return ONLY the JSON object, no markdown formatting, no code blocks.
`.trim();

        try {
            const response = await this.client.chat.completions.create({
                model: this.GENERATION_MODEL,
                messages: [{ role: 'user', content: prompt }],
            });
            const text = (response.choices[0].message.content ?? '').trim();
            const parsed = this.safeParseJSON<TeachingResponse>(text);
            this.logger.log(`Generated teaching block for student ${student.id}`);
            return parsed;
        } catch (error) {
            this.logger.error(`AI teaching generation failed: ${(error as Error).message}`);
            throw new InternalServerErrorException('Failed to generate teaching content from AI');
        }
    }

    async generateDoubtAnswer(
        question: string,
        student: StudentProfile,
        context: string,
        language: 'ml' | 'en' = 'ml',
        cluster: CapabilityCluster = CapabilityCluster.MEDIUM,
    ): Promise<DoubtResponse> {
        const tone = this.getDoubtTone(cluster);
        const languageInstruction =
            language === 'ml'
                ? 'Respond ENTIRELY in Malayalam (മലയാളം) script.'
                : 'Respond in English.';

        const prompt = `
You are VidyaBot, a patient and encouraging AI tutor for Kerala school students.

Student Information:
- Name: ${student.name}
- Grade: ${student.grade}
- Capability Level: ${cluster}

Response Style: ${tone}

Language Instruction: ${languageInstruction}

Current Topic Context:
${context}

Student's Question/Doubt:
"${question}"

Answer this student's doubt thoughtfully. Return a valid JSON object with exactly these fields:
{
  "answer": "Clear, direct answer to the student's question adapted to their level",
  "simple_analogy": "A concrete real-world analogy to make the concept stick",
  "encouragement": "A short, genuine encouragement message for the student"
}

Return ONLY the JSON object, no markdown formatting, no code blocks.
`.trim();

        try {
            const response = await this.client.chat.completions.create({
                model: this.GENERATION_MODEL,
                messages: [{ role: 'user', content: prompt }],
            });
            const text = (response.choices[0].message.content ?? '').trim();
            const parsed = this.safeParseJSON<DoubtResponse>(text);
            this.logger.log(`Generated doubt answer for student ${student.id}`);
            return parsed;
        } catch (error) {
            this.logger.error(`AI doubt answer generation failed: ${(error as Error).message}`);
            throw new InternalServerErrorException('Failed to generate doubt response from AI');
        }
    }
    async generateStudyNotes(
        student: StudentProfile,
        chatMessages: { role: string; content: string }[],
        language: 'ml' | 'en' = 'ml'
    ): Promise<{ topic: string; content: string }> {
        const languageInstruction =
            language === 'ml'
                ? 'Generate the notes ENTIRELY in Malayalam (മലയാളം) script.'
                : 'Generate the notes in English.';

        const chatTranscript = chatMessages
            .map(m => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');

        const prompt = `
You are an expert AI tutor for Kerala school students.

Student Information:
- Name: ${student.name}
- Grade: ${student.grade}

Language Instruction: ${languageInstruction}

Chat Transcript between Student and Tutor:
${chatTranscript}

Based on this recent chat transcript, generate comprehensive markdown study notes for the student.
Identify the main topic discussed and provide clear notes with headings, bullet points, and key takeaways.
Return a valid JSON object with EXACTLY these fields:
{
  "topic": "The main topic/chapter discussed",
  "content": "The generated markdown study notes"
}

Return ONLY the JSON object, no markdown formatting blocks containing the JSON.
`.trim();

        try {
            const response = await this.client.chat.completions.create({
                model: this.GENERATION_MODEL,
                messages: [{ role: 'user', content: prompt }],
            });
            const text = (response.choices[0].message.content ?? '').trim();
            const parsed = this.safeParseJSON<{ topic: string; content: string }>(text);
            this.logger.log(`Generated study notes for student ${student.id}`);
            return parsed;
        } catch (error) {
            this.logger.error(`AI study notes generation failed: ${(error as Error).message}`);
            throw new InternalServerErrorException('Failed to generate study notes from AI');
        }
    }

    async generateQuiz(
        student: StudentProfile,
        topic: string,
        context: string,
        language: 'ml' | 'en' = 'ml',
        questionCount: number = 5
    ): Promise<any[]> {
        const languageInstruction =
            language === 'ml'
                ? 'Generate the quiz ENTIRELY in Malayalam (മലയാളം) script.'
                : 'Generate the quiz in English.';

        const prompt = `
You are an expert AI tutor for Kerala school students.

Student Information:
- Name: ${student.name}
- Grade: ${student.grade}

Language Instruction: ${languageInstruction}

Topic: ${topic}
Context Material: ${context}

Generate a short multiple-choice quiz of EXACTLY ${questionCount} questions based on the topic and context provided. Make sure the difficulty is appropriate for the student's grade.
Return a valid JSON array where each element has EXACTLY these fields:
{
  "question_text": "The text of the question",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correct_answer_index": 0, // Integer index (0-3) of the correct option
  "explanation": "Brief explanation of why the answer is correct"
}

Return ONLY the JSON array, no markdown formatting blocks containing the JSON.
`.trim();

        try {
            const response = await this.client.chat.completions.create({
                model: this.GENERATION_MODEL,
                messages: [{ role: 'user', content: prompt }],
            });
            const text = (response.choices[0].message.content ?? '').trim();
            const parsed = this.safeParseJSON<any[]>(text);
            this.logger.log(`Generated quiz for student ${student.id} on topic ${topic}`);
            return parsed;
        } catch (error) {
            this.logger.error(`AI quiz generation failed: ${(error as Error).message}`);
            throw new InternalServerErrorException('Failed to generate quiz from AI');
        }
    }
}
