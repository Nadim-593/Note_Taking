import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', validateBody(registerSchema), authController.register);

// POST /api/v1/auth/login
router.post('/login', validateBody(loginSchema), authController.login);

// POST /api/v1/auth/logout
router.post('/logout', authController.logout);

// GET /api/v1/auth/me  (protected)
router.get('/me', authenticate, authController.getMe);

export default router;
