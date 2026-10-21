import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { AUTH_COOKIE } from '../middleware/auth';
import { NotFoundError } from '../utils/errors';
import { env } from '../config/env';

// ── Cookie options ─────────────────────────────────────────────────────────────

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function cookieOptions() {
  return {
    httpOnly: true,                                  // Not accessible via JS
    secure: env.nodeEnv === 'production',            // HTTPS only in production
    sameSite: 'strict' as const,                     // CSRF mitigation
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Creates a new user account. Role is always 'user'; admin cannot be assigned here.
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { user, token } = await authService.registerUser(req.body);

    res
      .cookie(AUTH_COOKIE, token, cookieOptions())
      .status(201)
      .json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { user, token } = await authService.loginUser(req.body);

    res
      .cookie(AUTH_COOKIE, token, cookieOptions())
      .status(200)
      .json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 *
 * Clears the HttpOnly cookie. JWTs are stateless — we do not maintain a
 * server-side revocation list in this phase. Logout is client-side: the cookie
 * is deleted from the browser so the token is no longer sent with requests.
 * This is the standard stateless-JWT logout approach; its limitation (the JWT
 * remains technically valid until expiry) is documented explicitly.
 */
export async function logout(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  res
    .clearCookie(AUTH_COOKIE, {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
    })
    .status(200)
    .json({
      success: true,
      message: 'Logged out successfully',
    });
}

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile. Requires authenticate middleware.
 */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // req.user is populated by the authenticate middleware
    const user = await authService.getUserById(req.user!.id);

    if (!user) {
      return next(new NotFoundError('User not found'));
    }

    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}
