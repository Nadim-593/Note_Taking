import { Request, Response, NextFunction } from 'express';
import * as noteService from '../services/note.service';

/**
 * POST /api/v1/notes
 */
export async function createNote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const note = await noteService.createNote(userId, req.body);

    res.status(201).json({
      success: true,
      data: { note },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/notes
 */
export async function getNotes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await noteService.getNotes(userId, role, { page, limit });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/notes/:id
 */
export async function getNoteById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const noteId = req.params.id;

    const note = await noteService.getNoteById(noteId, userId, role);

    res.status(200).json({
      success: true,
      data: { note },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notes/:id
 */
export async function updateNote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const noteId = req.params.id;

    const updatedNote = await noteService.updateNote(
      noteId,
      userId,
      role,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: { note: updatedNote },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/notes/:id
 */
export async function deleteNote(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const noteId = req.params.id;

    await noteService.deleteNote(noteId, userId, role);

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
