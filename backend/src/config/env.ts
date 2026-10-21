import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV ?? 'development';
const port = parseInt(process.env.PORT ?? '5000', 10);
const mongodbUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/secure-notes';
const jwtSecret = process.env.JWT_SECRET ?? 'change-me-in-production';
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

export const env = {
  port,
  nodeEnv,
  mongodbUri,
  jwtSecret,
  frontendUrl,
} as const;

/**
 * Validates critical environment variables.
 * Enforces production security guarantees without crashing in test or development.
 */
export function validateEnv(): void {
  const isProd = env.nodeEnv === 'production';
  const errors: string[] = [];

  // Validate port
  if (isNaN(env.port) || env.port <= 0 || env.port > 65535) {
    errors.push(`Invalid PORT configuration: "${process.env.PORT}". Must be an integer between 1 and 65535.`);
  }

  // Validate JWT Secret
  if (isProd) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me-in-production') {
      errors.push('JWT_SECRET must be set to a secure, random string (not the default fallback) in production.');
    } else if (process.env.JWT_SECRET.length < 16) {
      errors.push('JWT_SECRET is dangerously short. It must be at least 16 characters (recommended 32+).');
    } else if (process.env.JWT_SECRET.length < 32) {
      console.warn('⚠️  Warning: JWT_SECRET is shorter than the recommended 32 characters for production.');
    }

    if (!process.env.MONGODB_URI) {
      errors.push('MONGODB_URI environment variable is required in production.');
    } else if (process.env.MONGODB_URI.includes('localhost') || process.env.MONGODB_URI.includes('127.0.0.1')) {
      console.warn('⚠️  Warning: MONGODB_URI points to localhost in production mode. Ensure a cloud database (e.g. MongoDB Atlas) is configured.');
    }

    if (!process.env.FRONTEND_URL) {
      console.warn('⚠️  Warning: FRONTEND_URL is not set in production. Defaulting to http://localhost:3000. Set this to your frontend URL (e.g. https://your-app.vercel.app).');
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:\n  - ' + errors.join('\n  - '));
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
}
