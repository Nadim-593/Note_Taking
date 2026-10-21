# Indexing Strategy & Query Review — Secure Note-Taking Application

This document reviews every index in the application against actual query and aggregation patterns, documenting their justifications, performance characteristics, and limitations honestly.

---

## 1. Collection: `users`

### Primary Key: `{ _id: 1 }` (Automatic)
- **Type**: Unique B-tree index.
- **Pattern**: Point lookups by document ID (`User.findById()`, `$match: { _id: oid }`).
- **Justification**: Created automatically by MongoDB on all collections. No explicit declaration needed.

### Email: `{ email: 1 }` (Unique, Implicit via `unique: true`)
- **Type**: Unique single-field index.
- **Pattern**: `User.findOne({ email })` during login and registration duplicate checks.
- **Justification**: Enforces data integrity at the database level and provides $O(\log N)$ lookup.
- **Optimization Note**: Created implicitly via `unique: true` in the schema definition. Redundant `schema.index({ email: 1 })` was deliberately avoided to prevent duplicate index overhead.

### Creation Time: `{ createdAt: 1 }` (`users_createdAt`)
- **Type**: Single-field ascending index.
- **Pattern**: `GET /api/v1/users` (Admin paginated user listing ordered by registration date).
- **Execution Plan**: Satisfies the `.sort({ createdAt: 1, _id: 1 })` clause directly from the index, eliminating in-memory sorting. Supports cursor-based and offset pagination (`skip`/`limit`).

### Multikey: `{ interests: 1 }` (`users_interests`)
- **Type**: Multikey index on array elements.
- **Pattern**: Aggregation pipeline stage `$match: { interests: { $exists: true, $ne: [] } }`.
- **Honest Performance Analysis & Limitations**:
  - **What it does help**: When users with no interests exist in the collection, the leading `$match` stage can use this index to scan and filter only documents that have at least one indexed array entry, skipping users without interests.
  - **What it does NOT help**: MongoDB **cannot** use an index to accelerate a `$group` stage or an `$unwind` stage. When `$unwind: '$interests'` decomposes the array into individual stream documents, the subsequent `$group: { _id: '$interests' }` requires building an in-memory hash table of groups and accumulating matching users.
  - **Verdict**: We do NOT make false claims that `$group` is accelerated by this index. Its utility is strictly limited to the leading filter stage.

---

## 2. Collection: `notes`

### Compound: `{ owner: 1, createdAt: -1 }` (`notes_owner_createdAt`)
- **Type**: Compound B-tree index (equality prefix + sort suffix).
- **Pattern**: `GET /api/v1/notes` for standard users:
  ```js
  db.notes.find({ owner: userId }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit)
  ```
- **Justification**: The equality filter on `owner` matches the index prefix, while the range/sort on `createdAt` matches the second key in reverse order. MongoDB reads matching index keys in order, avoiding an in-memory sort entirely.
- **Omission**: A standalone `{ owner: 1 }` index is omitted because `{ owner: 1, createdAt: -1 }` satisfies any equality query on `owner` alone as a prefix scan.

### Single-field: `{ createdAt: -1 }` (`notes_createdAt`)
- **Type**: Single-field descending index.
- **Pattern**: `GET /api/v1/notes` for admin users (listing all notes globally):
  ```js
  db.notes.find({}).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit)
  ```
- **Justification**: An admin query does not filter by `owner`. The compound index `{ owner: 1, createdAt: -1 }` cannot satisfy a global sort on `createdAt` without scanning all index entries across all owners. A dedicated `{ createdAt: -1 }` index permits a direct descending walk of the notes collection in creation order.

---

## 3. Collection: `posts`

### Compound: `{ author: 1, createdAt: -1 }` (`posts_author_createdAt`)
- **Type**: Compound B-tree index.
- **Patterns Served**:
  1. Standard paginated author post queries (`db.posts.find({ author }).sort({ createdAt: -1 })`).
  2. **`$lookup` Join in `GET /api/v1/users/:id/posts`**:
     ```js
     {
       $lookup: {
         from: 'posts',
         let: { uid: '$_id' },
         pipeline: [
           { $match: { $expr: { $eq: ['$author', '$$uid'] } } },
           { $sort: { createdAt: -1, _id: -1 } },
           { $facet: { ... } }
         ]
       }
     }
     ```
- **Detailed Join Analysis (Task C Requirement)**:
  - In a `$lookup` pipeline, the foreign collection (`posts`) is queried for each document passed from the local collection (`users`).
  - Without an index on `posts.author`, MongoDB would perform a **full collection scan** on the `posts` collection ($O(U \times P)$ where $U$ is users and $P$ is total posts).
  - With `{ author: 1, createdAt: -1 }`, MongoDB performs a targeted index seek on the `posts` collection matching `author = user._id`.
  - Furthermore, because the index covers both the equality match on `author` and the requested sort on `createdAt: -1`, MongoDB walks the index keys in exact descending chronological order, serving the `$sort` stage and the subsequent `$facet` pagination without performing an in-memory sort.
  - This reduces join complexity from $O(P)$ per user to $O(\log P + K)$ (where $K$ is the page limit of posts).

---

## 4. Index Summary Matrix

| Collection | Name | Definition | Type | Query / Pipeline Stage Served |
|---|---|---|---|---|
| `users` | `_id_` | `{ _id: 1 }` | Unique | Document lookups (`findById`, `$match: { _id }`) |
| `users` | `email_1` | `{ email: 1 }` | Unique | Auth login, duplicate checks |
| `users` | `users_createdAt` | `{ createdAt: 1 }` | Single | `GET /api/v1/users` deterministic pagination |
| `users` | `users_interests` | `{ interests: 1 }` | Multikey | `$match: { interests: { $exists: true, $ne: [] } }` filter |
| `notes` | `_id_` | `{ _id: 1 }` | Unique | Note lookup by ID |
| `notes` | `notes_owner_createdAt` | `{ owner: 1, createdAt: -1 }` | Compound | `GET /api/v1/notes` user-isolated paginated listing |
| `notes` | `notes_createdAt` | `{ createdAt: -1 }` | Single | `GET /api/v1/notes` global admin paginated listing |
| `posts` | `_id_` | `{ _id: 1 }` | Unique | Post lookup by ID |
| `posts` | `posts_author_createdAt` | `{ author: 1, createdAt: -1 }` | Compound | Author post listing & `$lookup` foreign join + sort |

---

## 5. Deliberately Omitted Indexes

| Omitted Candidate | Reason |
|---|---|
| `users.role` | Extremely low cardinality (only 2 distinct values: `'user'` and `'admin'`). An index provides negligible selectivity and wastes write throughput. |
| `notes.owner` | Redundant prefix covered by `{ owner: 1, createdAt: -1 }`. |
| `posts.author` | Redundant prefix covered by `{ author: 1, createdAt: -1 }`. |
| Duplicate `users.email` | Avoided duplicate explicit `schema.index({ email: 1 })` since `unique: true` automatically registers the index. |
