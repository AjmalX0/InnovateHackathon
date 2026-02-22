export declare class UploadDocumentDto {
    studentId: string;
    sessionId?: string;
    label?: string;
}
export declare class UploadResponseDto {
    documentId: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    status: string;
    summary?: string;
    uploadedAt: string;
}
