export declare enum RagLanguage {
    MALAYALAM = "ml",
    ENGLISH = "en",
    MANGLISH = "mng",
    AUTO = "auto"
}
export declare class RagQueryDto {
    query: string;
    grade: number;
    language?: RagLanguage;
    topK?: number;
    studentId?: string;
}
