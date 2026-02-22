declare const _default: () => {
    port: number;
    nodeEnv: string;
    supabase: {
        url: string;
        anonKey: string;
        serviceKey: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    aiService: {
        url: string;
    };
    upload: {
        dest: string;
        maxFileSizeMb: number;
    };
    whisper: {
        mock: boolean;
        serviceUrl: string;
    };
    llm: {
        provider: string;
        apiKey: string;
        model: string;
        maxTokens: number;
    };
    tts: {
        mock: boolean;
        apiKey: string;
    };
};
export default _default;
