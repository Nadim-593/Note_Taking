export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  interests: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface InterestGroupUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface InterestGroup {
  interest: string;
  count: number;
  users: InterestGroupUser[];
}

export interface UserPostsResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    interests: string[];
  };
  items: Post[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}
