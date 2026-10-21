import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import User from '../src/models/User';
import Post from '../src/models/Post';
import { setupTestDB, teardownTestDB, clearCollections } from './helpers/db';

process.env.JWT_SECRET = 'test-secret-for-jest-suite-32chars!!';
process.env.NODE_ENV = 'test';

const AUTH_BASE = '/api/v1/auth';
const ADMIN_BASE = '/api/v1/admin';
const USERS_BASE = '/api/v1/users';

describe('MongoDB Aggregation Pipelines (Phase 6)', () => {
  let adminCookie: string;
  let regularCookie: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    // 1. Create Admin
    const adminRes = await request(app).post(`${AUTH_BASE}/register`).send({
      name: 'Super Admin',
      email: 'admin@example.com',
      password: 'AdminPassword1!',
    });
    const adminId = adminRes.body.data.user.id;
    await User.findByIdAndUpdate(adminId, { role: 'admin' });

    const adminLogin = await request(app).post(`${AUTH_BASE}/login`).send({
      email: 'admin@example.com',
      password: 'AdminPassword1!',
    });
    adminCookie = (adminLogin.headers['set-cookie'] as unknown as string[])[0];

    // 2. Create Regular User
    const regRes = await request(app).post(`${AUTH_BASE}/register`).send({
      name: 'Regular User',
      email: 'regular@example.com',
      password: 'UserPassword1!',
    });
    regularCookie = (regRes.headers['set-cookie'] as unknown as string[])[0];
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // TASK A: Group Users by Interests
  // ═════════════════════════════════════════════════════════════════════════════

  describe('GET /api/v1/admin/users/grouped-by-interest', () => {
    beforeEach(async () => {
      // Seed specific test data matching the prompt example:
      // User A: ["chess", "reading"]
      // User B: ["reading", "coding"]
      // User C: ["chess"]
      // User D: [] (no interests)
      await User.create([
        {
          name: 'User A',
          email: 'usera@example.com',
          passwordHash: 'dummy',
          role: 'user',
          interests: ['chess', 'reading'],
        },
        {
          name: 'User B',
          email: 'userb@example.com',
          passwordHash: 'dummy',
          role: 'user',
          interests: ['reading', 'coding'],
        },
        {
          name: 'User C',
          email: 'userc@example.com',
          passwordHash: 'dummy',
          role: 'user',
          interests: ['chess'],
        },
        {
          name: 'User D',
          email: 'userd@example.com',
          passwordHash: 'dummy',
          role: 'user',
          interests: [],
        },
      ]);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get(
        `${ADMIN_BASE}/users/grouped-by-interest`,
      );
      expect(res.status).toBe(401);
    });

    it('rejects non-admin users with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`${ADMIN_BASE}/users/grouped-by-interest`)
        .set('Cookie', regularCookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Insufficient permissions');
    });

    it('groups users accurately under their interests in alphabetical order', async () => {
      const res = await request(app)
        .get(`${ADMIN_BASE}/users/grouped-by-interest`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const groups = res.body.data.groups;

      // Interests present: 'chess', 'coding', 'reading' (sorted alphabetically)
      expect(groups).toHaveLength(3);

      // Group 1: chess -> User A, User C
      const chessGroup = groups.find((g: any) => g.interest === 'chess');
      expect(chessGroup).toBeDefined();
      expect(chessGroup.count).toBe(2);
      const chessEmails = chessGroup.users.map((u: any) => u.email).sort();
      expect(chessEmails).toEqual(['usera@example.com', 'userc@example.com']);

      // Group 2: coding -> User B
      const codingGroup = groups.find((g: any) => g.interest === 'coding');
      expect(codingGroup).toBeDefined();
      expect(codingGroup.count).toBe(1);
      expect(codingGroup.users[0].email).toBe('userb@example.com');

      // Group 3: reading -> User A, User B
      const readingGroup = groups.find((g: any) => g.interest === 'reading');
      expect(readingGroup).toBeDefined();
      expect(readingGroup.count).toBe(2);
      const readingEmails = readingGroup.users.map((u: any) => u.email).sort();
      expect(readingEmails).toEqual(['usera@example.com', 'userb@example.com']);

      // Sensitive fields must never be exposed
      groups.forEach((group: any) => {
        group.users.forEach((user: any) => {
          expect(user.passwordHash).toBeUndefined();
          expect(user.password).toBeUndefined();
        });
      });
    });

    it('excludes users with no interests without error or creating empty interest groups', async () => {
      const res = await request(app)
        .get(`${ADMIN_BASE}/users/grouped-by-interest`)
        .set('Cookie', adminCookie);

      const groups = res.body.data.groups;
      const allUserEmails = groups.flatMap((g: any) =>
        g.users.map((u: any) => u.email),
      );
      expect(allUserEmails).not.toContain('userd@example.com');
    });

    it('executes exactly ONE User.aggregate() call and NO other collection queries', async () => {
      const aggregateSpy = jest.spyOn(User, 'aggregate');
      const findSpy = jest.spyOn(User, 'find');
      const findOneSpy = jest.spyOn(User, 'findOne');
      const countSpy = jest.spyOn(User, 'countDocuments');

      const res = await request(app)
        .get(`${ADMIN_BASE}/users/grouped-by-interest`)
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);

      // Exact single aggregate execution constraint
      expect(aggregateSpy).toHaveBeenCalledTimes(1);

      // Verify no extra query methods were invoked
      expect(findSpy).not.toHaveBeenCalled();
      expect(findOneSpy).not.toHaveBeenCalled();
      expect(countSpy).not.toHaveBeenCalled();

      aggregateSpy.mockRestore();
      findSpy.mockRestore();
      findOneSpy.mockRestore();
      countSpy.mockRestore();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // TASK B: Retrieve a User's Posts Using $lookup
  // ═════════════════════════════════════════════════════════════════════════════

  describe('GET /api/v1/users/:id/posts ($lookup Aggregation)', () => {
    let authorId: string;
    let otherAuthorId: string;

    beforeEach(async () => {
      // 1. Author with 5 posts
      const author = await User.create({
        name: 'Author Alice',
        email: 'alice.posts@example.com',
        passwordHash: 'dummy',
        role: 'user',
        interests: ['tech', 'writing'],
      });
      authorId = author._id.toString();

      const posts = [];
      for (let i = 1; i <= 5; i++) {
        posts.push({
          title: `Post ${i} by Alice`,
          content: `Content of post ${i}`,
          author: author._id,
          createdAt: new Date(Date.now() + i * 1000),
        });
      }
      await Post.insertMany(posts);

      // 2. Another author with 2 posts (isolation check)
      const otherAuthor = await User.create({
        name: 'Other Author Bob',
        email: 'bob.posts@example.com',
        passwordHash: 'dummy',
        role: 'user',
      });
      otherAuthorId = otherAuthor._id.toString();

      await Post.create([
        {
          title: "Bob's Post 1",
          content: 'Bob content 1',
          author: otherAuthor._id,
        },
        {
          title: "Bob's Post 2",
          content: 'Bob content 2',
          author: otherAuthor._id,
        },
      ]);
    });

    it('is publicly accessible without authentication', async () => {
      const res = await request(app).get(`${USERS_BASE}/${authorId}/posts`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Author Alice');
    });

    it('returns only posts belonging to the specified user', async () => {
      const res = await request(app).get(`${USERS_BASE}/${authorId}/posts`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(5);
      res.body.data.items.forEach((post: any) => {
        expect(post.author).toBe(authorId);
      });

      // Verify none of Bob's posts appear
      const titles = res.body.data.items.map((p: any) => p.title);
      expect(titles).not.toContain("Bob's Post 1");
    });

    it('applies pagination correctly inside the lookup pipeline', async () => {
      // Page 1 with limit 2
      const resPage1 = await request(app).get(
        `${USERS_BASE}/${authorId}/posts?page=1&limit=2`,
      );
      expect(resPage1.status).toBe(200);
      expect(resPage1.body.data.page).toBe(1);
      expect(resPage1.body.data.limit).toBe(2);
      expect(resPage1.body.data.totalItems).toBe(5);
      expect(resPage1.body.data.totalPages).toBe(3);
      expect(resPage1.body.data.items).toHaveLength(2);

      // Page 3 with limit 2 (last remaining post)
      const resPage3 = await request(app).get(
        `${USERS_BASE}/${authorId}/posts?page=3&limit=2`,
      );
      expect(resPage3.status).toBe(200);
      expect(resPage3.body.data.items).toHaveLength(1);
      expect(resPage3.body.data.page).toBe(3);
    });

    it('returns an empty posts array when user has 0 posts', async () => {
      const noPostUser = await User.create({
        name: 'No Post User',
        email: 'noposts@example.com',
        passwordHash: 'dummy',
        role: 'user',
      });

      const res = await request(app).get(
        `${USERS_BASE}/${noPostUser._id}/posts`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.totalItems).toBe(0);
      expect(res.body.data.totalPages).toBe(0);
      expect(res.body.data.user.email).toBe('noposts@example.com');
    });

    it('returns 404 Not Found for nonexistent user ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`${USERS_BASE}/${nonExistentId}/posts`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('rejects malformed user ID with 400 Bad Request', async () => {
      const res = await request(app).get(`${USERS_BASE}/invalid-oid/posts`);
      expect(res.status).toBe(400);
    });

    it('executes exactly ONE User.aggregate() pipeline and NO Post queries', async () => {
      const userAggregateSpy = jest.spyOn(User, 'aggregate');
      const postFindSpy = jest.spyOn(Post, 'find');
      const postFindOneSpy = jest.spyOn(Post, 'findOne');
      const postCountSpy = jest.spyOn(Post, 'countDocuments');

      const res = await request(app).get(`${USERS_BASE}/${authorId}/posts`);

      expect(res.status).toBe(200);

      // Exactly ONE aggregation pipeline on User
      expect(userAggregateSpy).toHaveBeenCalledTimes(1);

      // Zero collection queries on Post
      expect(postFindSpy).not.toHaveBeenCalled();
      expect(postFindOneSpy).not.toHaveBeenCalled();
      expect(postCountSpy).not.toHaveBeenCalled();

      userAggregateSpy.mockRestore();
      postFindSpy.mockRestore();
      postFindOneSpy.mockRestore();
      postCountSpy.mockRestore();
    });
  });
});
