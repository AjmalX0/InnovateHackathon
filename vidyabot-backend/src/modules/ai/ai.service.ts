import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
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
    private readonly genAI: GoogleGenerativeAI;
    private readonly model: GenerativeModel;
    private readonly embedModel: GenerativeModel;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        this.genAI = genAI;
        this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.embedModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
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
        language: 'ml' | 'en' = 'ml',
        cluster: CapabilityCluster = CapabilityCluster.MEDIUM,
    ): Promise<TeachingResponse> {
        const tone = this.getTeachingTone(cluster);
        const languageInstruction =
            language === 'ml'
                ? 'Respond ENTIRELY in Malayalam (മലയാളം) script. Do not use English except for technical terms that have no Malayalam equivalent.'
                : 'Respond in English.';

        const syllabusContent = syllabusChunks
            .map((c, i) => `Chunk ${i + 1}:\n${c.content}`)
            .join('\n\n');

        const prompt = `
You are VidyaBot, an expert AI tutor for Kerala school students.

Student Information:
- Name: ${student.name}
- Grade: ${student.grade}
- Capability Level: ${cluster}

Teaching Style: ${tone}

Language Instruction: ${languageInstruction}

Syllabus Content to Teach:
${syllabusContent}

Generate a complete teaching block for this student. Return a valid JSON object with exactly these fields:
{
  "introduction": "An engaging opening that grabs attention (2-3 sentences)",
  "main_explanation": "The core lesson content adapted to the student's level",
  "summary": "A brief recap of the key points (3-5 bullet points)",
  "follow_up_question": "One question to check understanding"
}

Return ONLY the JSON object, no markdown formatting, no code blocks.
`.trim();

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text().trim();
            const parsed = JSON.parse(text) as TeachingResponse;
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
            const result = await this.model.generateContent(prompt);
            const text = result.response.text().trim();
            const parsed = JSON.parse(text) as DoubtResponse;
            this.logger.log(`Generated doubt answer for student ${student.id}`);
            return parsed;
        } catch (error) {
            this.logger.error(`AI doubt answer generation failed: ${(error as Error).message}`);
            throw new InternalServerErrorException('Failed to generate doubt response from AI');
        }
    }
}
