import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env';

// ── DNS Configuration ─────────────────────────────────────────────────────────
// Resolves MongoDB Atlas SRV records (querySrv ECONNREFUSED) common on Windows / local ISP DNS
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Fall back to system default if setting custom servers fails
}

// ── Connection options ────────────────────────────────────────────────────────
const MONGOOSE_OPTIONS: mongoose.ConnectOptions = {
  // Prefer server-side timeouts; keep defaults for pool size
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
};

// ── Connect ───────────────────────────────────────────────────────────────────
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri, MONGOOSE_OPTIONS);
  } catch (error) {
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
