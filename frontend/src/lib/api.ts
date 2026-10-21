import {
  ApiResponse,
  InterestGroup,
  Note,
  PaginatedResult,
  User,
  UserPostsResult,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  public statusCode: number;
  public data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // Required to send and receive HttpOnly cookies
    credentials: 'include',
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err: any) {
    throw new ApiError(
      'Unable to connect to the API server. Please ensure the backend is running.',
      0,
    );
  }

  // Handle non-JSON or empty response
  let json: ApiResponse<T>;
  const text = await response.text();
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(
      response.statusText || 'Unexpected server response',
      response.status,
    );
  }

  if (!response.ok || json.success === false) {
    const errorMessage =
      json.message ||
      (json as any).error ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, json);
  }

  return (json.data ?? (json as any)) as T;
}

export const api = {
  // ── Authentication ──────────────────────────────────────────────────────────
  auth: {
    async register(data: {
      name: string;
      email: string;
      password: string;
      interests?: string[];
    }): Promise<{ user: User }> {
      return request<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async login(data: {
      email: string;
      password: string;
    }): Promise<{ user: User }> {
      return request<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async logout(): Promise<{ success: boolean; message: string }> {
      return request<{ success: boolean; message: string }>('/auth/logout', {
        method: 'POST',
      });
    },

    async getMe(): Promise<{ user: User }> {
      return request<{ user: User }>('/auth/me', {
        method: 'GET',
      });
    },
  },

  // ── Notes ───────────────────────────────────────────────────────────────────
  notes: {
    async list(page = 1, limit = 10): Promise<PaginatedResult<Note>> {
      return request<PaginatedResult<Note>>(
        `/notes?page=${page}&limit=${limit}`,
        {
          method: 'GET',
        },
      );
    },

    async get(id: string): Promise<{ note: Note }> {
      return request<{ note: Note }>(`/notes/${id}`, {
        method: 'GET',
      });
    },

    async create(data: {
      title: string;
      content: string;
    }): Promise<{ note: Note }> {
      return request<{ note: Note }>('/notes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(
      id: string,
      data: { title?: string; content?: string },
    ): Promise<{ note: Note }> {
      return request<{ note: Note }>(`/notes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async delete(id: string): Promise<{ success: boolean; message: string }> {
      return request<{ success: boolean; message: string }>(`/notes/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // ── User Management (Admin) ─────────────────────────────────────────────────
  users: {
    async list(page = 1, limit = 10): Promise<PaginatedResult<User>> {
      return request<PaginatedResult<User>>(
        `/users?page=${page}&limit=${limit}`,
        {
          method: 'GET',
        },
      );
    },

    async get(id: string): Promise<{ user: User }> {
      return request<{ user: User }>(`/users/${id}`, {
        method: 'GET',
      });
    },

    async create(data: {
      name: string;
      email: string;
      password: string;
      role?: 'user' | 'admin';
      interests?: string[];
    }): Promise<{ user: User }> {
      return request<{ user: User }>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(
      id: string,
      data: {
        name?: string;
        email?: string;
        password?: string;
        role?: 'user' | 'admin';
        interests?: string[];
      },
    ): Promise<{ user: User }> {
      return request<{ user: User }>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async delete(id: string): Promise<{ success: boolean; message: string }> {
      return request<{ success: boolean; message: string }>(`/users/${id}`, {
        method: 'DELETE',
      });
    },

    // Public lookup endpoint for posts
    async getPosts(
      userId: string,
      page = 1,
      limit = 10,
    ): Promise<UserPostsResult> {
      return request<UserPostsResult>(
        `/users/${userId}/posts?page=${page}&limit=${limit}`,
        {
          method: 'GET',
        },
      );
    },
  },

  // ── Aggregations (Admin) ───────────────────────────────────────────────────
  admin: {
    async getInterestsGrouped(): Promise<{ groups: InterestGroup[] }> {
      return request<{ groups: InterestGroup[] }>(
        '/admin/users/grouped-by-interest',
        {
          method: 'GET',
        },
      );
    },
  },
};
