import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env';

// ── Connection options ────────────────────────────────────────────────────────
const MONGOOSE_OPTIONS: mongoose.ConnectOptions = {
  // Allow sufficient time for MongoDB Atlas cluster cold-starts or connection handshakes
  serverSelectionTimeoutMS: 15_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 10,
  minPoolSize: 1,
};

// ── Connect with Adaptive DNS Fallback ─────────────────────────────────────────
export async function connectDatabase(): Promise<void> {
  try {
    // Attempt connection with system DNS (standard for cloud platforms like Render, AWS, Docker)
    await mongoose.connect(env.mongodbUri, MONGOOSE_OPTIONS);
  } catch (error: any) {
    // If SRV lookup fails (common on Windows ISP DNS when resolving Atlas _mongodb._tcp SRV records),
    // adaptively fallback to public Google & Cloudflare DNS resolvers and retry.
    const isDnsError =
      error?.syscall === 'querySrv' ||
      error?.code === 'ECONNREFUSED' ||
      error?.message?.includes('querySrv');

    if (isDnsError) {
      try {
        console.warn('⚠️  SRV DNS resolution failed with system resolver. Retrying with Google/Cloudflare DNS (8.8.8.8, 1.1.1.1)...');
        dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
        await mongoose.connect(env.mongodbUri, MONGOOSE_OPTIONS);
        return;
      } catch (retryError) {
        console.error('❌ MongoDB connection failed after DNS fallback:', retryError);
        return;
      }
    }

    // Log but do not crash — health endpoint must stay available
    console.error('❌ MongoDB initial connection failed:', error);
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received — closing MongoDB connection…`);
  await mongoose.connection.close();
  console.log('MongoDB connection closed. Exiting.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ── Status helper (used by health endpoint) ───────────────────────────────────
export function getDatabaseStatus(): string {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] ?? 'unknown';
}
