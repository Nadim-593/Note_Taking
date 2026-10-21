/**
 * Admin Bootstrap Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the first admin account from environment variables.
 * Safe to run multiple times — idempotent (skips creation if email exists).
 *
 * Usage:
 *   ADMIN_NAME="Alice" ADMIN_EMAIL="alice@example.com" ADMIN_PASSWORD="Str0ng!Pass" \
 *     npx ts-node src/scripts/createAdmin.ts
 *
 * Or add to package.json:
 *   "create-admin": "ts-node src/scripts/createAdmin.ts"
 *
 * NEVER expose a public HTTP endpoint that performs this operation.
 */

import 'dotenv/config';
import dns from 'dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}
import { env } from '../config/env';
import User from '../models/User';

const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      '❌  ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in the environment.',
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌  ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  await mongoose.connect(env.mongodbUri);
  console.log('✅ Connected to MongoDB');

  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`ℹ️  Admin account already exists for ${email}. Nothing changed.`);
    } else {
      // Promote existing user to admin
      existing.role = 'admin';
      await existing.save();
      console.log(`✅ Promoted existing user ${email} to admin.`);
    }
  } else {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await User.create({ name, email, passwordHash, role: 'admin' });
    console.log(`✅ Admin account created for ${email}.`);
  }

  await mongoose.connection.close();
  console.log('Connection closed.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
