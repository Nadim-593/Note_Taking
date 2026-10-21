import { Router, Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'API server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    database: getDatabaseStatus(),
  });
});

export default router;
