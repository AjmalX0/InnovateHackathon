export declare enum MessageType {
    TEXT = "text",
    VOICE = "voice",
    DOCUMENT = "document"
}
export declare enum InputLanguage {
    MALAYALAM = "ml",
    ENGLISH = "en",
    MANGLISH = "mng",
    AUTO = "auto"
}
export declare class SendMessageDto {
    content: string;
    type: MessageType;
    studentId: string;
    inputLanguage?: InputLanguage;
    documentId?: string;
    sessionId?: string;
}
