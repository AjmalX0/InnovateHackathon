import { UploadDocumentDto, UploadResponseDto } from './dto/upload.dto';
import { SupabaseService } from '../supabase/supabase.service';
export declare class UploadService {
    private readonly supabase;
    private readonly logger;
    constructor(supabase: SupabaseService);
    register(file: Express.Multer.File, dto: UploadDocumentDto): Promise<UploadResponseDto>;
    findOne(documentId: string): Promise<UploadResponseDto>;
    findByStudent(studentId: string): Promise<UploadResponseDto[]>;
    markReady(documentId: string, summary: string): Promise<UploadResponseDto>;
    getFilePath(documentId: string): Promise<string>;
    private toResponse;
}
