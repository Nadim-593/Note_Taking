import bcrypt from 'bcryptjs';
import User, { IUser, UserRole } from '../models/User';
import Note from '../models/Note';
import Post from '../models/Post';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { validateObjectId } from '../utils/helpers';

const BCRYPT_ROUNDS = 12;

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  interests?: string[];
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  interests?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SafeUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedUsersResponse {
  items: SafeUserRecord[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

function toSafeUser(user: IUser): SafeUserRecord {
  return {
    id: (user._id as { toString(): string }).toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    interests: user.interests,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Creates a new user with administrative privilege.
 */
export async function createUser(
  input: CreateUserInput,
): Promise<SafeUserRecord> {
  const { name, email, password, role = 'user', interests = [] } = input;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ConflictError('A user with that email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    interests,
  });

  return toSafeUser(user);
}

/**
 * Lists users with deterministic sorting and pagination.
 * Utilizes the `{ createdAt: 1 }` index (`users_createdAt`).
 */
export async function getUsers(
  pagination: PaginationParams,
): Promise<PaginatedUsersResponse> {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [users, totalItems] = await Promise.all([
    User.find()
      .select('-passwordHash')
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    User.countDocuments().exec(),
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 0;

  return {
    items: users.map(toSafeUser),
    page,
    limit,
    totalItems,
    totalPages,
  };
}

/**
 * Retrieves a single user by ID.
 */
export async function getUserById(
  targetUserId: string,
): Promise<SafeUserRecord> {
  const oid = validateObjectId(targetUserId, 'User ID');
  const user = await User.findById(oid).select('-passwordHash').exec();

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return toSafeUser(user);
}

/**
 * Updates a user with administrative privilege.
 * Protects against demoting the last admin and duplicate emails.
 */
export async function updateUser(
  targetUserId: string,
  input: UpdateUserInput,
): Promise<SafeUserRecord> {
  const oid = validateObjectId(targetUserId, 'User ID');
  const user = await User.findById(oid).exec();

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check email conflict if email is being changed
  if (input.email && input.email !== user.email) {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new ConflictError('A user with that email already exists');
    }
    user.email = input.email;
  }

  // Prevent demoting the last admin
  if (user.role === 'admin' && input.role && input.role !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new BadRequestError('Cannot demote the last remaining admin account');
    }
    user.role = input.role;
  } else if (input.role) {
    user.role = input.role;
  }

  if (input.name) {
    user.name = input.name;
  }

  if (input.interests) {
    user.interests = input.interests;
  }

  if (input.password) {
    user.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  }

  await user.save();
  return toSafeUser(user);
}

/**
 * Safely deletes a user and cascades cleanup of their notes and posts.
 * Protects against:
 * - Deleting the currently authenticated admin session.
 * - Deleting the last admin account.
 */
export async function deleteUser(
  targetUserId: string,
  currentAdminId: string,
): Promise<{ success: boolean; message: string }> {
  const oid = validateObjectId(targetUserId, 'User ID');

  // Prevent self-deletion of current active admin session
  if (oid.toString() === currentAdminId) {
    throw new BadRequestError(
      'Cannot delete the currently authenticated admin account',
    );
  }

  const user = await User.findById(oid).exec();
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Prevent deleting the last remaining admin
  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new BadRequestError(
        'Cannot delete the last remaining admin account',
      );
    }
  }

  // Consistent data policy: cascade deletion of owned notes & posts
  await Promise.all([
    Note.deleteMany({ owner: oid }).exec(),
    Post.deleteMany({ author: oid }).exec(),
    User.findByIdAndDelete(oid).exec(),
  ]);

  return {
    success: true,
    message: 'User and all associated data deleted successfully',
  };
}
