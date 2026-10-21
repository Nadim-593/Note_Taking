import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  port: parseInt(process.env.PORT ?? '5000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/secure-notes',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
} as const;
