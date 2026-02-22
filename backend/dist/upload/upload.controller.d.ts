import { UploadService } from './upload.service';
import { UploadDocumentDto } from './dto/upload.dto';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    uploadDocument(file: Express.Multer.File, dto: UploadDocumentDto): Promise<import("./dto/upload.dto").UploadResponseDto>;
    getDocument(id: string): Promise<import("./dto/upload.dto").UploadResponseDto>;
    getByStudent(studentId: string): Promise<import("./dto/upload.dto").UploadResponseDto[]>;
}
