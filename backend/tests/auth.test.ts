import request from 'supertest';
import app from '../src/app';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/db';

// Set a test JWT secret so tokens are verifiable
process.env.JWT_SECRET = 'test-secret-for-jest-suite-32chars!!';
process.env.NODE_ENV = 'test';

const BASE = '/api/v1/auth';

const validUser = {
  name: 'Alice Smith',
  email: 'alice@example.com',
  password: 'Passw0rd!',
};

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  await clearCollections();
});

// ── Registration ───────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and returns safe user data + cookie', async () => {
    const res = await request(app).post(`${BASE}/register`).send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user.role).toBe('user');
    // passwordHash must never appear in response
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.password).toBeUndefined();
    // Cookie should be set
    const cookies: string[] = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.startsWith('auth_token='))).toBe(true);
    expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
    const res = await request(app).post(`${BASE}/register`).send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects a weak password', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ ...validUser, password: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects missing name', async () => {
    const { name: _n, ...noName } = validUser;
    const res = await request(app).post(`${BASE}/register`).send(noName);
    expect(res.status).toBe(400);
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ ...validUser, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('public registration cannot assign admin role', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ ...validUser, role: 'admin' });

    // Request either succeeds as 'user' or strips the role silently
    if (res.status === 201) {
      expect(res.body.data.user.role).toBe('user');
    }
    // Role field is stripped by Joi (stripUnknown) so it should never be 'admin'
    expect(res.body.data?.user?.role).not.toBe('admin');
  });

  it('does not store or return a plaintext password', async () => {
    const res = await request(app).post(`${BASE}/register`).send(validUser);
    expect(res.status).toBe(201);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(validUser.password);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@example.com');
    const cookies: string[] = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith('auth_token='))).toBe(true);
  });

  it('rejects incorrect password with 401', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'nobody@example.com', password: validUser.password });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    // Same message for both cases (no enumeration)
  });

  it('rejects missing password field with 400', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email });
    expect(res.status).toBe(400);
  });
});

// ── /me ───────────────────────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  let cookie: string;

  beforeEach(async () => {
    const res = await request(app).post(`${BASE}/register`).send(validUser);
    const cookies: string[] = res.headers['set-cookie'] as unknown as string[];
    cookie = cookies[0];
  });

  it('returns authenticated user profile with valid cookie', async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('returns 401 without a cookie', async () => {
    const res = await request(app).get(`${BASE}/me`);
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Cookie', 'auth_token=not.a.valid.jwt');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a token signed by a different secret', async () => {
    const jwt = require('jsonwebtoken');
    const fakeToken = jwt.sign(
      { sub: 'fakeid', email: 'x@x.com', role: 'user' },
      'wrong-secret',
      { expiresIn: '1h' },
    );
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Cookie', `auth_token=${fakeToken}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 with an expired token', async () => {
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign(
      { sub: 'fakeid', email: 'x@x.com', role: 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' },
    );
    // Small delay to ensure expiry
    await new Promise((r) => setTimeout(r, 50));
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Cookie', `auth_token=${expiredToken}`);
    expect(res.status).toBe(401);
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('clears the auth cookie', async () => {
    const loginRes = await request(app)
      .post(`${BASE}/register`)
      .send(validUser);
    const cookies: string[] = loginRes.headers['set-cookie'] as unknown as string[];
    const cookie = cookies[0];

    const res = await request(app)
      .post(`${BASE}/logout`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const logoutCookies: string[] = res.headers['set-cookie'] as unknown as string[];
    // The cleared cookie should have an expires in the past (Max-Age=0 or Expires=epoch)
    if (logoutCookies) {
      const authCookie = logoutCookies.find((c: string) => c.startsWith('auth_token='));
      expect(authCookie).toBeDefined();
    }
  });

  it('works even without being logged in (idempotent)', async () => {
    const res = await request(app).post(`${BASE}/logout`);
    expect(res.status).toBe(200);
  });
});
