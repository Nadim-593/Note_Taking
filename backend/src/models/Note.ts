import { Schema, model, Document, Model, Types } from 'mongoose';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface INote extends Document {
  title: string;
  content: string;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const noteSchema = new Schema<INote>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title must be at least 1 character'],
      maxlength: [200, 'Title must not exceed 200 characters'],
    },

    content: {
      type: String,
      required: [true, 'Content is required'],
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'notes',
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

/**
 * INDEX 1 — { owner, createdAt } (compound)
 *
 * Supports: paginated listing of notes belonging to a specific user, ordered
 * by creation time (most recent first or oldest first).
 * Query pattern:
 *   db.notes.find({ owner: <userId> }).sort({ createdAt: -1 }).skip(n).limit(k)
 *
 * The compound index satisfies both the equality filter on `owner` and the
 * range/sort on `createdAt` in a single index scan, avoiding an in-memory sort.
 * This is the primary read pattern for authenticated users viewing their notes.
 */
noteSchema.index({ owner: 1, createdAt: -1 }, { name: 'notes_owner_createdAt' });

/**
 * INDEX 2 — { createdAt } (single field, descending)
 *
 * Supports: admin listing of ALL notes sorted by creation time, without a
 * leading equality filter on owner.
 * Query pattern:
 *   db.notes.find({}).sort({ createdAt: -1 }).skip(n).limit(k)
 *
 * The compound index above (owner, createdAt) cannot satisfy a collection-wide
 * sort because the leading `owner` field makes it an inequality scan over the
 * entire index. A dedicated createdAt index covers this admin query efficiently.
 */
noteSchema.index({ createdAt: -1 }, { name: 'notes_createdAt' });

// ── Model ─────────────────────────────────────────────────────────────────────

const Note: Model<INote> = model<INote>('Note', noteSchema);

export default Note;
