import { Request, Response, NextFunction } from 'express';
import { ObjectSchema, AnySchema } from 'joi';
import { BadRequestError } from '../utils/errors';

/**
 * Validates req.body against a Joi schema.
 * Strips unknown fields (prevents mass assignment).
 * Throws BadRequestError with a human-readable message on failure.
 */
export function validateBody(schema: ObjectSchema | AnySchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true, // ← mass-assignment protection
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new BadRequestError(message));
    }

    req.body = value;
    next();
  };
}

/**
 * Validates req.query against a Joi schema.
 * Casts and applies defaults (e.g. string "1" -> number 1).
 */
export function validateQuery(schema: ObjectSchema | AnySchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new BadRequestError(message));
    }

    req.query = value;
    next();
  };
}

