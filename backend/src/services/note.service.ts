import { Types } from 'mongoose';
import Note, { INote } from '../models/Note';
import { NotFoundError } from '../utils/errors';
import { validateObjectId } from '../utils/helpers';

export interface CreateNoteInput {
  title: string;
  content: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedNotesResponse {
  items: INote[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Creates a new note owned strictly by the authenticated user.
 */
export async function createNote(
  userId: string,
  input: CreateNoteInput,
): Promise<INote> {
  const ownerId = validateObjectId(userId, 'User ID');

  const note = await Note.create({
    title: input.title,
    content: input.content,
    owner: ownerId,
  });

  return note;
}

/**
 * Lists notes with pagination and deterministic sorting.
 * - Regular users only see notes where owner == userId (uses { owner: 1, createdAt: -1 } index).
 * - Admin users can view all notes (uses { createdAt: -1 } index).
 */
export async function getNotes(
  userId: string,
  role: string,
  pagination: PaginationParams,
): Promise<PaginatedNotesResponse> {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  // Enforce ownership in the database query
  const filter =
    role === 'admin'
      ? {}
      : { owner: validateObjectId(userId, 'User ID') };

  const [items, totalItems] = await Promise.all([
    Note.find(filter)
      .sort({ createdAt: -1, _id: -1 }) // Deterministic sort
      .skip(skip)
      .limit(limit)
      .exec(),
    Note.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 0;

  return {
    items,
    page,
    limit,
    totalItems,
    totalPages,
  };
}

/**
 * Retrieves a single note by ID.
 * Direct database-level ownership check prevents cross-user access.
 */
export async function getNoteById(
  noteId: string,
  userId: string,
  role: string,
): Promise<INote> {
  const oid = validateObjectId(noteId, 'Note ID');
  const filter =
    role === 'admin'
      ? { _id: oid }
      : { _id: oid, owner: validateObjectId(userId, 'User ID') };

  const note = await Note.findOne(filter).exec();

  if (!note) {
    // Consistent 404 message to prevent resource enumeration
    throw new NotFoundError('Note not found');
  }

  return note;
}

/**
 * Updates a note.
 * Only title and content can be updated; owner is immutable.
 */
export async function updateNote(
  noteId: string,
  userId: string,
  role: string,
  input: UpdateNoteInput,
): Promise<INote> {
  const oid = validateObjectId(noteId, 'Note ID');
  const filter =
    role === 'admin'
      ? { _id: oid }
      : { _id: oid, owner: validateObjectId(userId, 'User ID') };

  // Explicit payload construction prevents changing owner or other metadata
  const updatePayload: Partial<{ title: string; content: string }> = {};
  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.content !== undefined) updatePayload.content = input.content;

  const updatedNote = await Note.findOneAndUpdate(
    filter,
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).exec();

  if (!updatedNote) {
    throw new NotFoundError('Note not found');
  }

  return updatedNote;
}

/**
 * Deletes a note.
 * Direct database-level ownership check ensures non-owners cannot delete.
 */
export async function deleteNote(
  noteId: string,
  userId: string,
  role: string,
): Promise<INote> {
  const oid = validateObjectId(noteId, 'Note ID');
  const filter =
    role === 'admin'
      ? { _id: oid }
      : { _id: oid, owner: validateObjectId(userId, 'User ID') };

  const deletedNote = await Note.findOneAndDelete(filter).exec();

  if (!deletedNote) {
    throw new NotFoundError('Note not found');
  }

  return deletedNote;
}
