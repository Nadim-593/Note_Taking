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

  // Mongoose invalid ObjectId / CastError
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid resource ID format',
    });
    return;
  }

  // Mongoose duplicate key error (code 11000 can be number or string)
  if ((err as any).code === 11000 || (err as any).code === '11000') {
    res.status(409).json({
      success: false,
      message: 'A resource with that value already exists',
    });
    return;
  }

  // JWT errors that bypassed route middleware
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
    });
    return;
  }

  // Unknown / unhandled server errors
  // In development, log the full error with stack trace
  // In production, log a structured message so cloud logs (Render) record the failure
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled error:', err);
  } else {
    console.error(`[${new Date().toISOString()}] Unhandled Server Error [${req.method} ${req.originalUrl}]:`, err.message);
  }

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
}
