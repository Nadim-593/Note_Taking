import app from './app';
import { env, validateEnv } from './config/env';
import { connectDatabase } from './config/database';

async function bootstrap(): Promise<void> {
  // Validate configuration before binding ports
  validateEnv();

  // Attempt DB connection (non-blocking — server starts regardless so health endpoint responds)
  connectDatabase().catch((err) => {
    console.warn('⚠️  Running without database connection:', err.message);
  });

  // Explicitly bind to 0.0.0.0 for containerized / cloud hosting (Render, Docker)
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${env.port}`);
    console.log(`   Environment : ${env.nodeEnv}`);
    console.log(`   Health check: http://localhost:${env.port}/api/v1/health`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
