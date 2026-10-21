import { Router } from 'express';
import * as noteController from '../controllers/note.controller';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createNoteSchema,
  updateNoteSchema,
  queryNoteSchema,
} from '../validators/note.validator';

const router = Router();

// All notes endpoints strictly require authentication
router.use(authenticate);

// POST /api/v1/notes
router.post('/', validateBody(createNoteSchema), noteController.createNote);

// GET /api/v1/notes (paginated)
router.get('/', validateQuery(queryNoteSchema), noteController.getNotes);

// GET /api/v1/notes/:id
router.get('/:id', noteController.getNoteById);

// PATCH /api/v1/notes/:id
router.patch('/:id', validateBody(updateNoteSchema), noteController.updateNote);

// DELETE /api/v1/notes/:id
router.delete('/:id', noteController.deleteNote);

export default router;
