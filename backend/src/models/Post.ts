import { Schema, model, Document, Model, Types } from 'mongoose';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IPost extends Document {
  title: string;
  content: string;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const postSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },

    content: {
      type: String,
      required: [true, 'Content is required'],
    },

    /**
     * author references the User model. Posts are stored in their own
     * collection ('posts') and are separate from notes.
     */
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'posts', // Explicit collection name — separate from notes
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

/**
 * INDEX 1 — { author, createdAt } (compound)
 *
 * Supports: paginated listing of posts written by a specific author, ordered
 * by creation time.
 * Query pattern:
 *   db.posts.find({ author: <userId> }).sort({ createdAt: -1 }).skip(n).limit(k)
 *
 * The compound index covers both the equality filter on `author` and the sort
 * on `createdAt`, avoiding a separate in-memory sort step.
 */
postSchema.index({ author: 1, createdAt: -1 }, { name: 'posts_author_createdAt' });

// ── Model ─────────────────────────────────────────────────────────────────────

const Post: Model<IPost> = model<IPost>('Post', postSchema);

export default Post;
