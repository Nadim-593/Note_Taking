import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Operational errors are safe to expose
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    res.status(422).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Mongoose duplicate key
  if ((err as NodeJS.ErrnoException).code === '11000') {
    res.status(409).json({
      success: false,
      message: 'A resource with that value already exists',
    });
    return;
  }

  // Unknown / programming errors — never leak details in production
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled error:', err);
  }

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
}
