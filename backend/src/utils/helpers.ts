import { Types } from 'mongoose';
import { BadRequestError } from './errors';

/**
 * Validates that a string is a valid MongoDB ObjectId.
 * Throws BadRequestError for malformed IDs so controllers stay clean.
 */
export function validateObjectId(id: string, label = 'ID'): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError(`Invalid ${label}: ${id}`);
  }
  return new Types.ObjectId(id);
}

/**
 * Strips undefined values from an object (useful for safe partial updates).
 */
export function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}
