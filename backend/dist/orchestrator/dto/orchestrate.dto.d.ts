export declare enum OrchestratorInputType {
    TEXT = "text",
    VOICE = "voice",
    DOCUMENT = "document",
    IMAGE = "image"
}
export declare class OrchestrateDto {
    content: string;
    studentId: string;
    sessionId?: string;
    grade: number;
    language?: string;
    inputType?: OrchestratorInputType;
    learningNeeds?: string[];
    documentId?: string;
    withTts?: boolean;
}
