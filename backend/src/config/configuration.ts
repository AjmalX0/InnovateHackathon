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
});
