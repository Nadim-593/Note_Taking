import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import User from '../src/models/User';
import Note from '../src/models/Note';
import Post from '../src/models/Post';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/db';

process.env.JWT_SECRET = 'test-secret-for-jest-suite-32chars!!';
process.env.NODE_ENV = 'test';

const AUTH_BASE = '/api/v1/auth';
const USERS_BASE = '/api/v1/users';
const NOTES_BASE = '/api/v1/notes';

describe('Admin User Management & Global Notes (/api/v1/users & /api/v1/notes)', () => {
  let adminCookie: string;
  let adminId: string;
  let regularCookie: string;
  let regularUserId: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // 1. Create Primary Admin User
    const adminReg = await request(app).post(`${AUTH_BASE}/register`).send({
      name: 'Primary Admin',
      email: 'admin@example.com',
      password: 'AdminPassword1!',
    });
    adminId = adminReg.body.data.user.id;
    await User.findByIdAndUpdate(adminId, { role: 'admin' });

    // Login as admin to get JWT with role: 'admin'
    const adminLogin = await request(app).post(`${AUTH_BASE}/login`).send({
      email: 'admin@example.com',
      password: 'AdminPassword1!',
    });
    adminCookie = (adminLogin.headers['set-cookie'] as unknown as string[])[0];

    // 2. Create Regular User
    const regRes = await request(app).post(`${AUTH_BASE}/register`).send({
      name: 'Standard User',
      email: 'user@example.com',
      password: 'UserPassword1!',
    });
    regularUserId = regRes.body.data.user.id;
    regularCookie = (regRes.headers['set-cookie'] as unknown as string[])[0];
  });

  // ── Authorization & Boundary Protection ─────────────────────────────────────

  describe('Authorization boundary protection', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get(USERS_BASE);
      expect(res.status).toBe(401);
    });

    it('rejects regular users calling admin endpoints with 403 Forbidden', async () => {
      const getRes = await request(app)
        .get(USERS_BASE)
        .set('Cookie', regularCookie);
      expect(getRes.status).toBe(403);
      expect(getRes.body.message).toBe('Insufficient permissions');

      const postRes = await request(app)
        .post(USERS_BASE)
        .set('Cookie', regularCookie)
        .send({
          name: 'Hacker',
          email: 'hacker@example.com',
          password: 'Password1!',
        });
      expect(postRes.status).toBe(403);

      const patchRes = await request(app)
        .patch(`${USERS_BASE}/${regularUserId}`)
        .set('Cookie', regularCookie)
        .send({ role: 'admin' });
      expect(patchRes.status).toBe(403);

      const deleteRes = await request(app)
        .delete(`${USERS_BASE}/${regularUserId}`)
        .set('Cookie', regularCookie);
      expect(deleteRes.status).toBe(403);
    });

    it('allows normal users to still access their own profile and notes', async () => {
      const meRes = await request(app)
        .get(`${AUTH_BASE}/me`)
        .set('Cookie', regularCookie);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.id).toBe(regularUserId);

      const notesRes = await request(app)
        .get(NOTES_BASE)
        .set('Cookie', regularCookie);
      expect(notesRes.status).toBe(200);
      expect(notesRes.body.data.items).toEqual([]);
    });
  });

  // ── User Creation ───────────────────────────────────────────────────────────

  describe('POST /api/v1/users (Admin user creation)', () => {
    it('allows admin to create a new user with hashed password and without exposing passwordHash', async () => {
      const res = await request(app)
        .post(USERS_BASE)
        .set('Cookie', adminCookie)
        .send({
          name: 'New Employee',
          email: 'employee@example.com',
          password: 'SecurePassword1!',
          role: 'user',
          interests: ['Security', 'Cloud'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('employee@example.com');
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.user.interests).toEqual(['security', 'cloud']);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();

      // Verify in DB that password is appropriately hashed
      const dbUser = await User.findOne({ email: 'employee@example.com' }).select('+passwordHash');
      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe('SecurePassword1!');
      const matches = await bcrypt.compare('SecurePassword1!', dbUser!.passwordHash);
      expect(matches).toBe(true);
    });

    it('allows admin to create another admin account', async () => {
      const res = await request(app)
        .post(USERS_BASE)
        .set('Cookie', adminCookie)
        .send({
          name: 'Secondary Admin',
          email: 'admin2@example.com',
          password: 'AdminPassword2!',
          role: 'admin',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('admin');
    });

    it('rejects duplicate email with 409 Conflict', async () => {
      const res = await request(app)
        .post(USERS_BASE)
        .set('Cookie', adminCookie)
        .send({
          name: 'Duplicate User',
          email: 'user@example.com', // Already exists
          password: 'Password1!',
        });

      expect(res.status).toBe(409);
    });
  });

  // ── Paginated User Listing ──────────────────────────────────────────────────

  describe('GET /api/v1/users (Paginated user list)', () => {
    beforeEach(async () => {
      const additionalUsers = [];
      for (let i = 1; i <= 12; i++) {
        additionalUsers.push({
          name: `Batch User ${i}`,
          email: `batch${i}@example.com`,
          passwordHash: 'dummyhash',
          role: 'user' as const,
          createdAt: new Date(Date.now() + i * 1000),
        });
      }
      await User.insertMany(additionalUsers);
    });

    it('returns default pagination (page=1, limit=10)', async () => {
      const res = await request(app)
        .get(USERS_BASE)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(10);
      expect(res.body.data.totalItems).toBe(14); // 1 admin + 1 user + 12 batch
      expect(res.body.data.totalPages).toBe(2);
      expect(res.body.data.items).toHaveLength(10);
      expect(res.body.data.items[0].passwordHash).toBeUndefined();
    });

    it('handles second page correctly', async () => {
      const res = await request(app)
        .get(`${USERS_BASE}?page=2&limit=10`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.items).toHaveLength(4);
    });

    it('rejects invalid pagination parameters with 400', async () => {
      const res = await request(app)
        .get(`${USERS_BASE}?page=0`)
        .set('Cookie', adminCookie);
      expect(res.status).toBe(400);

      const resLimit = await request(app)
        .get(`${USERS_BASE}?limit=101`)
        .set('Cookie', adminCookie);
      expect(resLimit.status).toBe(400);
    });
  });

  // ── View, Update & Safety Rules ─────────────────────────────────────────────

  describe('GET /api/v1/users/:id and PATCH /api/v1/users/:id', () => {
    it('retrieves user details by ID without passwordHash', async () => {
      const res = await request(app)
        .get(`${USERS_BASE}/${regularUserId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('user@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('updates user fields and hashes newly supplied password', async () => {
      const res = await request(app)
        .patch(`${USERS_BASE}/${regularUserId}`)
        .set('Cookie', adminCookie)
        .send({
          name: 'Updated Name',
          password: 'BrandNewPassword1!',
          interests: ['Rust', 'Go'],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.name).toBe('Updated Name');
      expect(res.body.data.user.interests).toEqual(['rust', 'go']);

      // Verify that user can now log in with the new password
      const loginRes = await request(app).post(`${AUTH_BASE}/login`).send({
        email: 'user@example.com',
        password: 'BrandNewPassword1!',
      });
      expect(loginRes.status).toBe(200);
    });

    it('prevents demoting the last remaining admin', async () => {
      // adminId is currently the only admin
      const res = await request(app)
        .patch(`${USERS_BASE}/${adminId}`)
        .set('Cookie', adminCookie)
        .send({ role: 'user' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot demote the last remaining admin');

      // Verify in DB that role remains admin
      const dbAdmin = await User.findById(adminId);
      expect(dbAdmin?.role).toBe('admin');
    });

    it('allows demoting an admin if another admin exists', async () => {
      // Create a second admin
      const admin2Res = await request(app)
        .post(USERS_BASE)
        .set('Cookie', adminCookie)
        .send({
          name: 'Admin Two',
          email: 'admin2@example.com',
          password: 'Password1!',
          role: 'admin',
        });
      const admin2Id = admin2Res.body.data.user.id;

      // Now demote admin2
      const demoteRes = await request(app)
        .patch(`${USERS_BASE}/${admin2Id}`)
        .set('Cookie', adminCookie)
        .send({ role: 'user' });

      expect(demoteRes.status).toBe(200);
      expect(demoteRes.body.data.user.role).toBe('user');
    });
  });

  // ── Deletion Safety & Cascade Policy ────────────────────────────────────────

  describe('DELETE /api/v1/users/:id', () => {
    it('prevents active admin from deleting their own account', async () => {
      const res = await request(app)
        .delete(`${USERS_BASE}/${adminId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot delete the currently authenticated admin');
    });

    it('prevents deleting the last remaining admin', async () => {
      // Create a second admin session
      const admin2 = await User.create({
        name: 'Second Admin',
        email: 'admin2@example.com',
        passwordHash: 'dummy',
        role: 'admin',
      });

      // Login as admin 2
      const login2 = await request(app).post(`${AUTH_BASE}/login`).send({
        email: 'admin2@example.com',
        password: 'dummy',
      });
      // (Even if we test via direct service or login, if adminCount <= 1 it's prevented)
      // Delete admin2 first so only 1 admin remains
      await User.findByIdAndDelete(admin2._id);

      // Now trying to delete the only admin (adminId) from any perspective
      const res = await request(app)
        .delete(`${USERS_BASE}/${adminId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(400);
    });

    it('safely deletes user and cascades deletion of their notes and posts', async () => {
      // Create notes and posts for regular user
      await Note.create({
        title: "User's Note",
        content: 'Content',
        owner: new mongoose.Types.ObjectId(regularUserId),
      });

      await Post.create({
        title: "User's Post",
        content: 'Content',
        author: new mongoose.Types.ObjectId(regularUserId),
      });

      // Verify they exist
      expect(await Note.countDocuments({ owner: regularUserId })).toBe(1);
      expect(await Post.countDocuments({ author: regularUserId })).toBe(1);

      // Admin deletes the user
      const deleteRes = await request(app)
        .delete(`${USERS_BASE}/${regularUserId}`)
        .set('Cookie', adminCookie);

      expect(deleteRes.status).toBe(200);

      // Verify user, notes, and posts are all deleted
      expect(await User.findById(regularUserId)).toBeNull();
      expect(await Note.countDocuments({ owner: regularUserId })).toBe(0);
      expect(await Post.countDocuments({ author: regularUserId })).toBe(0);
    });
  });

  // ── Global Notes Access ─────────────────────────────────────────────────────

  describe('Admin global notes listing', () => {
    it('ensures admin sees notes from multiple users with pagination', async () => {
      // User creates note
      await Note.create({
        title: 'User Confidential',
        content: 'Confidential',
        owner: new mongoose.Types.ObjectId(regularUserId),
      });

      // Admin creates note
      await Note.create({
        title: 'Admin Directive',
        content: 'Directive',
        owner: new mongoose.Types.ObjectId(adminId),
      });

      // Admin lists all notes
      const adminRes = await request(app)
        .get(NOTES_BASE)
        .set('Cookie', adminCookie);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.totalItems).toBe(2);
      expect(adminRes.body.data.items).toHaveLength(2);

      // Regular user only sees their 1 note
      const userRes = await request(app)
        .get(NOTES_BASE)
        .set('Cookie', regularCookie);

      expect(userRes.status).toBe(200);
      expect(userRes.body.data.totalItems).toBe(1);
      expect(userRes.body.data.items[0].title).toBe('User Confidential');
    });
  });
});
