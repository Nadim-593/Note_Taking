import { Types } from 'mongoose';
import User from '../models/User';
import { NotFoundError } from '../utils/errors';
import { validateObjectId } from '../utils/helpers';

export interface PostSummary {
  _id: Types.ObjectId;
  title: string;
  content: string;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPostsResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    interests: string[];
  };
  items: PostSummary[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface UserPostsPaginationParams {
  page: number;
  limit: number;
}

/**
 * Retrieves a user's posts via a single MongoDB aggregation pipeline with $lookup.
 *
 * Pipeline Stages:
 * 1. $match: Targets the requested user by _id.
 * 2. $lookup: Joins the physical 'posts' collection using $expr on { author: user._id }.
 *    Utilizes the compound index { author: 1, createdAt: -1 } on the posts collection.
 *    Inside the lookup pipeline, $facet calculates both paginated items and total count.
 * 3. $project: Formats safe user profile and flattens posts facet data.
 */
export async function aggregateUserPosts(
  userId: string,
  pagination: UserPostsPaginationParams,
): Promise<UserPostsResult> {
  const oid = validateObjectId(userId, 'User ID');
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const pipeline = [
    // Stage 1: Match the specific user
    {
      $match: { _id: oid },
    },
    // Stage 2: $lookup to join 'posts' collection with internal pagination & count facet
    {
      $lookup: {
        from: 'posts',
        let: { uid: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$author', '$$uid'] },
            },
          },
          {
            $sort: { createdAt: -1 as const, _id: -1 as const },
          },
          {
            $facet: {
              items: [
                { $skip: skip },
                { $limit: limit },
                {
                  $project: {
                    _id: 1,
                    title: 1,
                    content: 1,
                    author: 1,
                    createdAt: 1,
                    updatedAt: 1,
                  },
                },
              ],
              totalCount: [{ $count: 'count' }],
            },
          },
        ],
        as: 'postsData',
      },
    },
    // Stage 3: Shape the output safely
    {
      $project: {
        _id: 0,
        user: {
          id: '$_id',
          name: '$name',
          email: '$email',
          role: '$role',
          interests: '$interests',
        },
        postsData: { $arrayElemAt: ['$postsData', 0] },
      },
    },
    // Stage 4: Extract items and compute totalItems
    {
      $project: {
        user: 1,
        items: '$postsData.items',
        totalItems: {
          $ifNull: [{ $arrayElemAt: ['$postsData.totalCount.count', 0] }, 0],
        },
      },
    },
  ];

  const results = await User.aggregate(pipeline).exec();

  if (!results || results.length === 0) {
    throw new NotFoundError('User not found');
  }

  const raw = results[0];
  const totalItems = Number(raw.totalItems) || 0;
  const totalPages = Math.ceil(totalItems / limit) || 0;

  return {
    user: raw.user,
    items: raw.items || [],
    page,
    limit,
    totalItems,
    totalPages,
  };
}
