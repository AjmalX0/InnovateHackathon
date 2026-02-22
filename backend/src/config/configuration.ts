export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'vidyabot-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  },

  upload: {
    dest: process.env.UPLOAD_DEST || './uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  },

  whisper: {
    mock: process.env.WHISPER_MOCK !== 'false', // true by default
    serviceUrl: process.env.WHISPER_SERVICE_URL || 'http://localhost:9000',
  },

  llm: {
    // provider: 'groq' (default, free & fast) or 'openai'
    provider:  process.env.LLM_PROVIDER  || 'groq',
    apiKey:    process.env.LLM_API_KEY   || '',
    // Groq: 'llama-3.3-70b-versatile'  |  OpenAI: 'gpt-4o-mini'
    model:     process.env.LLM_MODEL     || 'llama-3.3-70b-versatile',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS, 10) || 1024,
  },

  tts: {
    // mock = return placeholder URL; real = call Google/ElevenLabs TTS
    mock:  process.env.TTS_MOCK !== 'false',
    apiKey: process.env.TTS_API_KEY || '',
  },
});
