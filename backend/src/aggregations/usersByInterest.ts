import User from '../models/User';

export interface GroupedUserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface GroupedInterestResult {
  interest: string;
  count: number;
  users: GroupedUserSummary[];
}

/**
 * Groups users by their interests using exactly ONE MongoDB aggregation pipeline.
 *
 * Pipeline Stages:
 * 1. $match: Filter out users with empty/missing interests array.
 *    (Utilizes multikey index { interests: 1 } if sparse).
 * 2. $unwind: Deconstruct the interests array so each interest produces a separate document.
 * 3. $group: Group by normalized interest string, accumulating user info.
 *    (Note: MongoDB cannot use an index to accelerate $group; this executes in-memory).
 * 4. $sort: Sort interests alphabetically for deterministic output.
 * 5. $project: Shape safe projection (never exposes passwordHash or private fields).
 */
export async function aggregateUsersByInterest(): Promise<GroupedInterestResult[]> {
  const results = await User.aggregate<GroupedInterestResult>([
    {
      $match: {
        interests: { $exists: true, $ne: [] },
      },
    },
    {
      $unwind: '$interests',
    },
    {
      $group: {
        _id: '$interests',
        count: { $sum: 1 },
        users: {
          $push: {
            id: '$_id',
            name: '$name',
            email: '$email',
            role: '$role',
          },
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
    {
      $project: {
        _id: 0,
        interest: '$_id',
        count: 1,
        users: 1,
      },
    },
  ]).exec();

  return results;
}
