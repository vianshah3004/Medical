import 'dotenv/config';

const config = {
  port:       parseInt(process.env.PORT || '3001', 10),
  nodeEnv:    process.env.NODE_ENV || 'development',
  isDev:      (process.env.NODE_ENV || 'development') === 'development',

  db: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret:    process.env.JWT_SECRET || 'fallback-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  mlApi: {
    url: process.env.ML_API_URL || 'http://localhost:8010',
  },

  storage: {
    url:             process.env.SUPABASE_URL,
    serviceKey:      process.env.SUPABASE_SERVICE_KEY,
    bucket:          process.env.SUPABASE_STORAGE_BUCKET || 'medical-scans',
    signedUrlExpiry: parseInt(process.env.STORAGE_SIGNED_URL_EXPIRY || '3600', 10),
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'DiagnoScope <noreply@diagnoscope.ai>',
  },
};

export default config;
