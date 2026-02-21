import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class AiService {
    private httpService;
    private configService;
    private readonly aiUrl;
    constructor(httpService: HttpService, configService: ConfigService);
    chat(payload: any): Promise<any>;
    processDocument(file: Express.Multer.File, grade: number, studentId: string): Promise<any>;
    generateQuiz(noteContent: string, grade: number, studentId: string): Promise<any>;
}
