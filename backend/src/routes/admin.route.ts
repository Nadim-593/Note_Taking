import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Strict boundary protection: authenticate + authorize('admin')
router.use(authenticate, authorize('admin'));

// GET /api/v1/admin/users/grouped-by-interest
router.get(
  '/users/grouped-by-interest',
  adminController.getUsersGroupedByInterest,
);

export default router;
