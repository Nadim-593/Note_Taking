import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  queryUserSchema,
} from '../validators/user.validator';

const router = Router();

// ── Public Routes ─────────────────────────────────────────────────────────────

// GET /api/v1/users/:id/posts (Publicly accessible user posts via $lookup)
router.get('/:id/posts', validateQuery(queryUserSchema), userController.getUserPosts);

// ── Admin-Only Routes ─────────────────────────────────────────────────────────

// Strict boundary protection: authenticate + authorize('admin')
router.use(authenticate, authorize('admin'));

// POST /api/v1/users
router.post('/', validateBody(createUserSchema), userController.createUser);

// GET /api/v1/users (paginated)
router.get('/', validateQuery(queryUserSchema), userController.getUsers);

// GET /api/v1/users/:id
router.get('/:id', userController.getUserById);

// PATCH /api/v1/users/:id
router.patch('/:id', validateBody(updateUserSchema), userController.updateUser);

// DELETE /api/v1/users/:id
router.delete('/:id', userController.deleteUser);

export default router;
