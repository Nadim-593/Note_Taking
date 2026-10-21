import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import User from '../src/models/User';
import Note from '../src/models/Note';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/db';

process.env.JWT_SECRET = 'test-secret-for-jest-suite-32chars!!';
process.env.NODE_ENV = 'test';

const AUTH_BASE = '/api/v1/auth';
const NOTES_BASE = '/api/v1/notes';

describe('Notes API (/api/v1/notes)', () => {
  let userACookie: string;
  let userBCookie: string;
  let adminCookie: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // 1. Register User A
    const resA = await request(app).post(`${AUTH_BASE}/register`).send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'Password1!',
    });
    userACookie = (resA.headers['set-cookie'] as unknown as string[])[0];
    userAId = resA.body.data.user.id;

    // 2. Register User B
    const resB = await request(app).post(`${AUTH_BASE}/register`).send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'Password1!',
    });
    userBCookie = (resB.headers['set-cookie'] as unknown as string[])[0];
    userBId = resB.body.data.user.id;

    // 3. Register Admin User (Promoted directly in DB)
    const resAdmin = await request(app).post(`${AUTH_BASE}/register`).send({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'Password1!',
    });
    const adminId = resAdmin.body.data.user.id;
    await User.findByIdAndUpdate(adminId, { role: 'admin' });

    // Login as admin to get a fresh token with role: 'admin' in claims
    const loginAdminRes = await request(app).post(`${AUTH_BASE}/login`).send({
      email: 'admin@example.com',
      password: 'Password1!',
    });
    adminCookie = (loginAdminRes.headers['set-cookie'] as unknown as string[])[0];
  });

  // ── Authentication Checks ───────────────────────────────────────────────────

  describe('Authentication requirements', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const getRes = await request(app).get(NOTES_BASE);
      expect(getRes.status).toBe(401);

      const postRes = await request(app).post(NOTES_BASE).send({
        title: 'Secret',
        content: 'Content',
      });
      expect(postRes.status).toBe(401);
    });
  });

  // ── Note Creation & Ownership ───────────────────────────────────────────────

  describe('POST /api/v1/notes', () => {
    it('creates a note owned by the authenticated user', async () => {
      const res = await request(app)
        .post(NOTES_BASE)
        .set('Cookie', userACookie)
        .send({
          title: 'My First Note',
          content: 'This is confidential.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.note.title).toBe('My First Note');
      expect(res.body.data.note.content).toBe('This is confidential.');
      expect(res.body.data.note.owner).toBe(userAId);
    });

    it('ignores client-supplied owner in request body and forces authenticated user id', async () => {
      const spoofedOwnerId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(NOTES_BASE)
        .set('Cookie', userACookie)
        .send({
          title: 'Spoofed Owner Note',
          content: 'Attempting to assign to someone else.',
          owner: spoofedOwnerId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.note.owner).toBe(userAId);
      expect(res.body.data.note.owner).not.toBe(spoofedOwnerId);
    });

    it('validates required fields and length limits', async () => {
      // Empty title
      const resEmptyTitle = await request(app)
        .post(NOTES_BASE)
        .set('Cookie', userACookie)
        .send({ title: '', content: 'Content' });
      expect(resEmptyTitle.status).toBe(400);

      // Missing content
      const resNoContent = await request(app)
        .post(NOTES_BASE)
        .set('Cookie', userACookie)
        .send({ title: 'Title' });
      expect(resNoContent.status).toBe(400);

      // Title exceeding 200 characters
      const longTitle = 'A'.repeat(201);
      const resLongTitle = await request(app)
        .post(NOTES_BASE)
        .set('Cookie', userACookie)
        .send({ title: longTitle, content: 'Content' });
      expect(resLongTitle.status).toBe(400);
    });
  });

  // ── Listing & Pagination ───────────────────────────────────────────────────

  describe('GET /api/v1/notes (Pagination & Isolation)', () => {
    beforeEach(async () => {
      // Create 15 notes for User A
      const notesA = [];
      for (let i = 1; i <= 15; i++) {
        notesA.push({
          title: `User A Note ${i}`,
          content: `Content ${i}`,
          owner: new mongoose.Types.ObjectId(userAId),
          createdAt: new Date(Date.now() + i * 1000), // Incremental timestamps
        });
      }
      await Note.insertMany(notesA);

      // Create 3 notes for User B
      const notesB = [];
      for (let i = 1; i <= 3; i++) {
        notesB.push({
          title: `User B Note ${i}`,
          content: `Content ${i}`,
          owner: new mongoose.Types.ObjectId(userBId),
          createdAt: new Date(Date.now() + i * 1000),
        });
      }
      await Note.insertMany(notesB);
    });

    it('returns default pagination (page=1, limit=10) with user isolation', async () => {
      const res = await request(app)
        .get(NOTES_BASE)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(10);
      expect(res.body.data.totalItems).toBe(15);
      expect(res.body.data.totalPages).toBe(2);
      expect(res.body.data.items).toHaveLength(10);

      // Ensure none of User B's notes are present
      res.body.data.items.forEach((note: any) => {
        expect(note.owner).toBe(userAId);
      });
    });

    it('handles second page correctly', async () => {
      const res = await request(app)
        .get(`${NOTES_BASE}?page=2&limit=10`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.items).toHaveLength(5);
    });

    it('rejects invalid pagination parameters with 400', async () => {
      // Invalid page (<= 0)
      const resInvalidPage = await request(app)
        .get(`${NOTES_BASE}?page=0`)
        .set('Cookie', userACookie);
      expect(resInvalidPage.status).toBe(400);

      // Invalid limit (negative or 0)
      const resInvalidLimit = await request(app)
        .get(`${NOTES_BASE}?limit=-5`)
        .set('Cookie', userACookie);
      expect(resInvalidLimit.status).toBe(400);

      // Non-numeric page
      const resNaN = await request(app)
        .get(`${NOTES_BASE}?page=abc`)
        .set('Cookie', userACookie);
      expect(resNaN.status).toBe(400);
    });

    it('enforces maximum page size (limit > 100 rejected with 400)', async () => {
      const res = await request(app)
        .get(`${NOTES_BASE}?limit=101`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(400);
    });

    it('allows admin to list notes across all users', async () => {
      const res = await request(app)
        .get(NOTES_BASE)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.totalItems).toBe(18); // 15 from A + 3 from B
    });
  });

  // ── Read Single Note ────────────────────────────────────────────────────────

  describe('GET /api/v1/notes/:id', () => {
    let noteAId: string;

    beforeEach(async () => {
      const note = await Note.create({
        title: "User A's Secret",
        content: 'Top secret content',
        owner: new mongoose.Types.ObjectId(userAId),
      });
      noteAId = note._id.toString();
    });

    it('allows owner to read their note', async () => {
      const res = await request(app)
        .get(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.data.note.title).toBe("User A's Secret");
    });

    it('prevents User B from reading User A note (returns 404)', async () => {
      const res = await request(app)
        .get(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', userBCookie);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Note not found');
    });

    it('allows admin to read any user note', async () => {
      const res = await request(app)
        .get(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.note.title).toBe("User A's Secret");
    });

    it('rejects malformed ObjectIds with 400', async () => {
      const res = await request(app)
        .get(`${NOTES_BASE}/not-a-valid-id`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(400);
    });

    it('returns 404 for nonexistent valid ObjectId', async () => {
      const randomId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`${NOTES_BASE}/${randomId}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(404);
    });
  });

  // ── Update Note ─────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/notes/:id', () => {
    let noteAId: string;

    beforeEach(async () => {
      const note = await Note.create({
        title: 'Original Title',
        content: 'Original Content',
        owner: new mongoose.Types.ObjectId(userAId),
      });
      noteAId = note._id.toString();
    });

    it('allows owner to update title and content', async () => {
      const res = await request(app)
        .patch(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', userACookie)
        .send({
          title: 'Updated Title',
          content: 'Updated Content',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.note.title).toBe('Updated Title');
      expect(res.body.data.note.content).toBe('Updated Content');
    });

    it('prevents changing note owner through PATCH', async () => {
      const spoofedOwnerId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', userACookie)
        .send({
          title: 'Modified Title',
          owner: spoofedOwnerId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.note.owner).toBe(userAId);
      expect(res.body.data.note.owner).not.toBe(spoofedOwnerId);

      // Verify in DB
      const dbNote = await Note.findById(noteAId);
      expect(dbNote?.owner.toString()).toBe(userAId);
    });

    it('prevents User B from updating User A note (returns 404)', async () => {
      const res = await request(app)
        .patch(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', userBCookie)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(404);

      // Ensure DB was not modified
      const dbNote = await Note.findById(noteAId);
      expect(dbNote?.title).toBe('Original Title');
    });

    it('allows admin to update any user note', async () => {
      const res = await request(app)
        .patch(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', adminCookie)
        .send({ title: 'Admin Moderated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.note.title).toBe('Admin Moderated Title');
    });

    it('rejects empty update payload with 400', async () => {
      const res = await request(app)
        .patch(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', userACookie)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── Delete Note ─────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/notes/:id', () => {
    let noteAId: string;

    beforeEach(async () => {
      const note = await Note.create({
        title: 'Note to be deleted',
        content: 'Content',
        owner: new mongoose.Types.ObjectId(userAId),
      });
      noteAId = note._id.toString();
    });

    it('allows owner to delete their note', async () => {
      const res = await request(app)
        .delete(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbNote = await Note.findById(noteAId);
      expect(dbNote).toBeNull();
    });

    it('prevents User B from deleting User A note (returns 404)', async () => {
      const res = await request(app)
        .delete(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', userBCookie);

      expect(res.status).toBe(404);

      const dbNote = await Note.findById(noteAId);
      expect(dbNote).not.toBeNull();
    });

    it('allows admin to delete any note', async () => {
      const res = await request(app)
        .delete(`${NOTES_BASE}/${noteAId}`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);

      const dbNote = await Note.findById(noteAId);
      expect(dbNote).toBeNull();
    });

    it('rejects malformed ObjectId with 400', async () => {
      const res = await request(app)
        .delete(`${NOTES_BASE}/invalid-id`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(400);
    });

    it('returns 404 for deleting nonexistent note', async () => {
      const randomId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`${NOTES_BASE}/${randomId}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(404);
    });
  });
});
