# Secure Note-Taking Application

A production-grade, full-stack Secure Note-Taking Application designed for technical assessment. Built with Next.js App Router, Express, TypeScript, and MongoDB with Mongoose. Features stateless JWT authentication via HttpOnly cookies, strict database query-level tenant isolation, role-based access control, explicit indexing, and advanced MongoDB aggregation pipelines.

---

## 1. Architecture & Technology Stack

| Layer | Technologies | Key Highlights |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons | 13 functional pages, centralized API client, AuthContext, server-driven pagination, no mock data |
| **Backend** | Node.js, Express.js, TypeScript, Mongoose 8 | Modular layers (routes, controllers, services, models, validators, aggregations) |
| **Database** | MongoDB with Mongoose | Strict schemas, explicit `schema.index()` declarations, cascade cleanup, aggregations |
| **Security** | bcryptjs (12 rounds), JWT, HttpOnly Cookies, Joi | Timing attack protection, mass-assignment stripping, no tokens in localStorage |

---

## 2. Repository Structure

```
secure-note-taking-app/
├── backend/
│   ├── src/
│   │   ├── aggregations/      # Pure aggregation pipelines (usersByInterest, userPostsLookup)
│   │   ├── config/            # Database connection & env config
│   │   ├── controllers/       # HTTP request/response handlers
│   │   ├── middleware/        # auth, validate, errorHandler
│   │   ├── models/            # Mongoose models (User, Note, Post) & indexes.md
│   │   ├── routes/            # Express routers (auth, notes, users, admin, health)
│   │   ├── scripts/           # createAdmin.ts CLI bootstrap script
│   │   ├── services/          # Core business logic & database queries
│   │   ├── utils/             # Typed errors & ObjectId helpers
│   │   ├── validators/        # Joi input validation schemas
│   │   ├── app.ts             # Express application configuration
│   │   └── server.ts          # Server entry point
│   ├── tests/                 # Jest integration tests (71 passing tests)
│   │   ├── helpers/db.ts      # Isolated in-memory MongoDB test runner
│   │   ├── auth.test.ts
│   │   ├── note.test.ts
│   │   ├── admin.test.ts
│   │   └── aggregation.test.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   │   ├── page.tsx       # Landing page
│   │   │   ├── login/         # Sign-in
│   │   │   ├── register/      # Sign-up
│   │   │   ├── dashboard/     # User overview
│   │   │   ├── notes/         # Notes listing, new, [id], [id]/edit
│   │   │   ├── profile/       # Safe profile & interests view
│   │   │   ├── admin/         # Admin users, notes, and interests aggregation
│   │   │   └── users/[id]/posts/ # Public posts with $lookup join
│   │   ├── components/        # Navbar, Pagination, Alert, ConfirmModal, LoadingSpinner
│   │   ├── context/           # AuthContext (loads /auth/me with HttpOnly cookies)
│   │   ├── lib/               # Centralized API client (api.ts)
│   │   └── types/             # Shared TypeScript interfaces
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

---

## 3. Installation & Getting Started

### Prerequisites
- **Node.js**: v18.x or higher (tested on Node v24.15.0)
- **npm**: v9.x or higher (tested on npm 11.12.1)
- **MongoDB**: Local MongoDB instance or Atlas connection string

### Step 1: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```



### Step 3: Bootstrap the First Admin Account
To create an initial admin account safely without public endpoints, run:
```bash
cd backend
ADMIN_NAME="Alice Admin" ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="AdminPassword123!" npm run create-admin
```

### Step 4: Run the Applications
Open two terminals:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

---

## 4. API Endpoints & Permissions Reference

| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Server & MongoDB connection status |
| `POST` | `/api/v1/auth/register` | Public | Register standard user account (`role: 'user'`), sets HttpOnly cookie |
| `POST` | `/api/v1/auth/login` | Public | Timing-safe login, issues JWT via HttpOnly cookie |
| `POST` | `/api/v1/auth/logout` | Public (idempotent) | Clears `auth_token` cookie |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieves current authenticated user profile |
| `POST` | `/api/v1/notes` | Authenticated | Creates note; strictly assigns `owner = req.user.id` |
| `GET` | `/api/v1/notes` | Authenticated | Paginated note listing. Standard users see only their own notes; admins see all notes |
| `GET` | `/api/v1/notes/:id` | Authenticated | Reads note by ID (database-enforced owner filter) |
| `PATCH` | `/api/v1/notes/:id` | Authenticated | Updates title/content; ownership is strictly immutable |
| `DELETE` | `/api/v1/notes/:id` | Authenticated | Deletes note with database-enforced owner filter |
| `POST` | `/api/v1/users` | Admin Only | Admin creates user account with explicit role assignment |
| `GET` | `/api/v1/users` | Admin Only | Paginated list of users (`users_createdAt` index) |
| `GET` | `/api/v1/users/:id` | Admin Only | Reads user details by ID |
| `PATCH` | `/api/v1/users/:id` | Admin Only | Updates user fields; prevents demoting the last admin |
| `DELETE` | `/api/v1/users/:id` | Admin Only | Deletes user with cascade cleanup of notes & posts; prevents self/last admin deletion |
| `GET` | `/api/v1/admin/users/grouped-by-interest` | Admin Only | **Task A**: Groups users under interests via **single `User.aggregate()`** |
| `GET` | `/api/v1/users/:id/posts` | Public | **Task B**: User posts via **single `User.aggregate()` with `$lookup`** |

---

## 5. Security & Ownership Isolation

- **Query-Level Isolation**:
  - Regular user queries strictly enforce `{ _id: noteId, owner: userId }` directly in database operations.
  - Unauthorized access attempts yield a clean `404 Not Found` rather than `403`, preventing resource and user enumeration.
- **Stateless JWT via HttpOnly Cookies**:
  - Cookie name: `auth_token`
  - Flags: `httpOnly: true`, `sameSite: 'strict'`, `secure: process.env.NODE_ENV === 'production'`.
  - Inaccessible to client JavaScript, preventing token theft via XSS. No tokens are stored in `localStorage` or `sessionStorage`.
- **Password Protection**:
  - Hashed using `bcryptjs` with a work factor of 12.
  - Constant-time verification on login prevents user-enumeration timing side-channels.
  - `passwordHash` has `select: false` on the schema and is stripped from all API outputs.
- **Mass Assignment Prevention**:
  - Joi schemas use `stripUnknown: true` on request bodies and queries. Public registration strips `role` and forces `user`.

---

## 6. Mandatory Pagination Design

All list endpoints implement database-level pagination:
- `page`: Integer $\ge 1$ (default `1`).
- `limit`: Integer $\ge 1$ (default `10`, capped at `100`).
- Returns standardized pagination metadata:
  ```json
  {
    "items": [...],
    "page": 1,
    "limit": 10,
    "totalItems": 25,
    "totalPages": 3
  }
  ```
- Uses `.skip()` and `.limit()` on database cursors. Never retrieves entire collections into memory.

---

## 7. Explicit Indexing Strategy (`schema.index()`)

Full index analysis is documented in `backend/src/models/indexes.md`.

| Collection | Index Name | Definition | Type | Supported Query Pattern |
|---|---|---|---|---|
| `users` | `_id_` | `{ _id: 1 }` | Unique | Document lookups (`findById`, `$match: { _id }`) |
| `users` | `email_1` | `{ email: 1 }` | Unique | Login & duplicate registration checks (implicit via `unique: true`) |
| `users` | `users_createdAt` | `{ createdAt: 1 }` | Single | `GET /api/v1/users` deterministic pagination |
| `users` | `users_interests` | `{ interests: 1 }` | Multikey | `$match: { interests: { $exists: true, $ne: [] } }` filter before `$unwind` |
| `notes` | `_id_` | `{ _id: 1 }` | Unique | Note lookup by ID |
| `notes` | `notes_owner_createdAt` | `{ owner: 1, createdAt: -1 }` | Compound | `GET /api/v1/notes` user-isolated paginated listing |
| `notes` | `notes_createdAt` | `{ createdAt: -1 }` | Single | `GET /api/v1/notes` global admin paginated listing |
| `posts` | `_id_` | `{ _id: 1 }` | Unique | Post lookup by ID |
| `posts` | `posts_author_createdAt` | `{ author: 1, createdAt: -1 }` | Compound | Author post listing & `$lookup` foreign join + sort |

### Honest Performance Analysis & Limitations:
1. **Multikey Index on `interests`**: Only aids the initial `$match` filter stage. MongoDB **cannot** use an index to accelerate `$group` or `$unwind`; grouping creates an in-memory accumulator table. We do not make false claims that `$group` is indexed.
2. **Foreign Compound Index on `posts`**: In `$lookup`, for the matched user, MongoDB queries `posts` matching `author == user._id` and sorts by `createdAt: -1`. The `{ author: 1, createdAt: -1 }` index avoids a full collection scan on `posts` ($O(P)$), enabling a targeted index seek and sorted traversal in $O(\log P + K)$.

---

## 8. MongoDB Aggregation Pipelines

### Task A: Group Users by Interests
- **Endpoint**: `GET /api/v1/admin/users/grouped-by-interest`
- **Location**: `backend/src/aggregations/usersByInterest.ts`
- **Implementation**: Uses **exactly ONE `User.aggregate()` call** and zero additional queries:
  ```typescript
  User.aggregate([
    { $match: { interests: { $exists: true, $ne: [] } } },
    { $unwind: '$interests' },
    {
      $group: {
        _id: '$interests',
        count: { $sum: 1 },
        users: {
          $push: { id: '$_id', name: '$name', email: '$email', role: '$role' }
        }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, interest: '$_id', count: 1, users: 1 } }
  ])
  ```

### Task B: Retrieve a User's Posts via `$lookup`
- **Endpoint**: `GET /api/v1/users/:id/posts`
- **Location**: `backend/src/aggregations/userPostsLookup.ts`
- **Implementation**: Uses **exactly ONE `User.aggregate()` call** joining physical collection `'posts'`:
  ```typescript
  User.aggregate([
    { $match: { _id: oid } },
    {
      $lookup: {
        from: 'posts',
        let: { uid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$author', '$$uid'] } } },
          { $sort: { createdAt: -1, _id: -1 } },
          {
            $facet: {
              items: [{ $skip: skip }, { $limit: limit }, { $project: { ... } }],
              totalCount: [{ $count: 'count' }]
            }
          }
        ],
        as: 'postsData'
      }
    },
    { $project: { user: { ... }, postsData: { $arrayElemAt: ['$postsData', 0] } } },
    { $project: { user: 1, items: '$postsData.items', totalItems: { $ifNull: [{ $arrayElemAt: ['$postsData.totalCount.count', 0] }, 0] } } }
  ])
  ```

---

## 9. Automated Testing & Verification

The backend test suite runs against an isolated in-memory MongoDB database (`mongodb-memory-server`):

```bash
cd backend
npm test
```

### Actual Test Results (71 / 71 Tests Passing):
```
PASS tests/note.test.ts (24 tests)
PASS tests/admin.test.ts (17 tests)
PASS tests/aggregation.test.ts (12 tests)
PASS tests/auth.test.ts (18 tests)

Test Suites: 4 passed, 4 total
Tests:       71 passed, 71 total
Snapshots:   0 total
Time:        81.197 s
```

### Build & Type Verification
```bash
# Backend verification
cd backend
npm run type-check    # tsc --noEmit (Exit code: 0)
npm run build         # tsc (Exit code: 0, compiled to dist/)

# Frontend verification
cd frontend
npx tsc --noEmit      # tsc --noEmit (Exit code: 0)
npm run build         # next build (Exit code: 0, 16/16 routes generated)
```

---

## 10. Known Limitations

- **MongoDB in Production**: Running in a live cluster requires setting `MONGODB_URI` and `JWT_SECRET`. Without a live database, the backend starts in resilient mode with `GET /api/v1/health` returning `"database": "disconnected"`.
- **Stateless Logout**: Stateless JWTs in HttpOnly cookies are revoked on the client by deleting the cookie with an expired epoch. The token remains valid until expiry unless a server-side Redis denylist is added.
