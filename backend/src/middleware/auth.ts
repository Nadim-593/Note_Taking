import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import type { UserRole } from '../models/User';

// ── Augment Express Request ───────────────────────────────────────────────────

/**
 * Only safe, non-sensitive fields are attached to the request context.
 * passwordHash is never included here.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ── JWT payload shape ─────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ── Cookie name constant ──────────────────────────────────────────────────────

export const AUTH_COOKIE = 'auth_token';

// ── Middleware: require valid JWT (HttpOnly cookie or Authorization: Bearer header) ──

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // Check HttpOnly cookie first; fall back to Authorization: Bearer header for API / SSR clients
  let token: string | undefined = req.cookies?.[AUTH_COOKIE];

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1];
    }
  }

  if (!token) {
    return next(new UnauthorizedError('Authentication required'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Session expired — please log in again'));
    }
    return next(new UnauthorizedError('Invalid authentication token'));
  }
}

// ── Middleware: require specific roles ────────────────────────────────────────

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}
