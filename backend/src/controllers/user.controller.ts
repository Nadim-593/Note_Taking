import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { aggregateUserPosts } from '../aggregations/userPostsLookup';

/**
 * GET /api/v1/users/:id/posts
 * Publicly retrieves a user's posts via a single aggregation pipeline with $lookup.
 */
export async function getUserPosts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = req.params.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await aggregateUserPosts(targetUserId, { page, limit });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/users
 */
export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await userService.createUser(req.body);

    res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/users
 */
export async function getUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await userService.getUsers({ page, limit });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/users/:id
 */
export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = req.params.id;
    const user = await userService.getUserById(targetUserId);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/users/:id
 */
export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = req.params.id;
    const user = await userService.updateUser(targetUserId, req.body);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/users/:id
 */
export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = req.params.id;
    const currentAdminId = req.user!.id;

    const result = await userService.deleteUser(targetUserId, currentAdminId);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
