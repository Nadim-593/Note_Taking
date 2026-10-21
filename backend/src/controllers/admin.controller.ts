import { Request, Response, NextFunction } from 'express';
import { aggregateUsersByInterest } from '../aggregations/usersByInterest';

/**
 * GET /api/v1/admin/users/grouped-by-interest
 * Returns users grouped by their shared interests using a single aggregation pipeline.
 */
export async function getUsersGroupedByInterest(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const groups = await aggregateUsersByInterest();

    res.status(200).json({
      success: true,
      data: { groups },
    });
  } catch (err) {
    next(err);
  }
}
