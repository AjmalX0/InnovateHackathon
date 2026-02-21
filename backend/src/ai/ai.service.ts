import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
    private readonly aiUrl: string;

    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
    ) {
        this.aiUrl = this.configService.get('AI_SERVICE_URL') || 'http://localhost:8001';
    }

    async chat(payload: any) {
        try {
            const { data } = await firstValueFrom(
                this.httpService.post(`${this.aiUrl}/chat`, payload, { timeout: 30000 })
            );
            return data;
        } catch {
            throw new HttpException('AI service error', 503);
        }
    }

    async processDocument(file: Express.Multer.File, grade: number, studentId: string) {
        const formData = new FormData();
        formData.append('file', new Blob([file.buffer as any]), file.originalname);
        formData.append('grade', grade.toString());
        formData.append('student_id', studentId);

        const { data } = await firstValueFrom(
            this.httpService.post(`${this.aiUrl}/process-document`, formData)
        );
        return data;
    }

    async generateQuiz(noteContent: string, grade: number, studentId: string) {
        const { data } = await firstValueFrom(
            this.httpService.post(`${this.aiUrl}/generate-quiz`, {
                note_content: noteContent,
                grade,
                student_id: studentId,
            })
        );
        return data;
    }
}
