import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';

async function bootstrap(): Promise<void> {
  // Attempt DB connection (non-blocking — server starts regardless)
  connectDatabase().catch((err) => {
    console.warn('⚠️  Running without database connection:', err.message);
  });

  app.listen(env.port, () => {
    console.log(`🚀 Server running on http://localhost:${env.port}`);
    console.log(`   Environment : ${env.nodeEnv}`);
    console.log(`   Health check: http://localhost:${env.port}/api/v1/health`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
