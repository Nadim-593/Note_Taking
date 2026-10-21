import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { env } from '../config/env';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import type { JwtPayload } from '../middleware/auth';

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = '7d';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  interests?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Safe user payload — never includes passwordHash */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSafeUser(user: IUser): SafeUser {
  return {
    id: (user._id as { toString(): string }).toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    interests: user.interests,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function signToken(user: IUser): string {
  const payload: JwtPayload = {
    sub: (user._id as { toString(): string }).toString(),
    email: user.email,
    role: user.role,
  };

  // jwt.sign accepts a StringOrArray, not our typed payload directly —
  // cast through unknown to satisfy the overload.
  return jwt.sign(payload as unknown as object, env.jwtSecret, {
    expiresIn: JWT_EXPIRY,
  });
}

// ── Service methods ───────────────────────────────────────────────────────────

export async function registerUser(
  input: RegisterInput,
): Promise<{ user: SafeUser; token: string }> {
  const { name, email, password, interests = [] } = input;

  // Check for duplicate email before hashing (cheaper early exit)
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ConflictError('An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Role is hardcoded to 'user' — public registration cannot escalate privilege
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: 'user',
    interests,
  });

  const token = signToken(user);
  return { user: toSafeUser(user), token };
}

export async function loginUser(
  input: LoginInput,
): Promise<{ user: SafeUser; token: string }> {
  const { email, password } = input;

  // Explicitly select passwordHash (it is excluded by default via select:false)
  const user = await User.findOne({ email }).select('+passwordHash');

  // Use constant-time comparison even for "user not found" to prevent
  // user-enumeration via timing side-channel
  const dummyHash = '$2a$12$invalidhashfortimingprotection00000000000000000000000000';
  const hashToCompare = user?.passwordHash ?? dummyHash;

  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatch) {
    // Same message for both "no user" and "wrong password" — prevents enumeration
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = signToken(user);
  return { user: toSafeUser(user), token };
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  const user = await User.findById(id);
  return user ? toSafeUser(user) : null;
}
