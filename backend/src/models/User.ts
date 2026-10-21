import { Schema, model, Document, Model } from 'mongoose';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },

    /**
     * Email is normalised to lowercase before save so that the unique index
     * treats "Alice@Example.com" and "alice@example.com" as the same address.
     */
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // Creates an implicit unique index — see indexing note below
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      // Never select this field by default to avoid accidental exposure
      select: false,
    },

    role: {
      type: String,
      enum: { values: ['user', 'admin'], message: 'Role must be user or admin' },
      default: 'user',
    },

    /**
     * Interests are normalised to lowercase and trimmed before save.
     * Used by an aggregation that groups users by shared interests.
     */
    interests: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'users',
  },
);

// ── Pre-save normalisation ────────────────────────────────────────────────────

userSchema.pre('save', function (next) {
  // Normalise each interest to lowercase and trim whitespace
  if (this.isModified('interests')) {
    this.interests = this.interests.map((i) => i.trim().toLowerCase());
  }
  next();
});

// ── Indexes ───────────────────────────────────────────────────────────────────

/**
 * INDEX 1 — email (unique, implicit)
 *
 * The `unique: true` option on the email field already instructs Mongoose /
 * MongoDB to create a unique ascending index on { email: 1 }.
 * We do NOT add a redundant schema.index({ email: 1 }) here.
 *
 * Supports: user login lookup — db.users.find({ email: <normalised> })
 */

/**
 * INDEX 2 — createdAt (ascending)
 *
 * Supports: paginated admin user listing ordered by registration date.
 * Query pattern: db.users.find({}).sort({ createdAt: 1 }).skip(n).limit(k)
 *
 * A single-field createdAt index lets MongoDB satisfy the sort without a
 * collection scan, enabling efficient cursor-based or offset pagination.
 */
userSchema.index({ createdAt: 1 }, { name: 'users_createdAt' });

/**
 * INDEX 3 — interests (multikey)
 *
 * Supports: pre-filtering users who have at least one specific interest
 * before grouping, e.g.:
 *   db.users.aggregate([
 *     { $match: { interests: "typescript" } },   // ← uses this index
 *     { $group: { _id: "$interests", count: … } }
 *   ])
 *
 * NOTE: A multikey index on `interests` helps the $match stage but does NOT
 * help the $group stage itself — MongoDB cannot use an index to accelerate
 * $group. If the aggregation groups the entire collection without a leading
 * $match, this index offers no benefit and a collection scan is expected.
 * The index is kept only for the $match use-case described above.
 */
userSchema.index({ interests: 1 }, { name: 'users_interests' });

// ── Model ─────────────────────────────────────────────────────────────────────

const User: Model<IUser> = model<IUser>('User', userSchema);

export default User;
