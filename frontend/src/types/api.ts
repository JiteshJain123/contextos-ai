/**
 * API response envelope types.
 *
 * Mirrors the shapes produced by backend/src/lib/response.ts. Defined here
 * (not in @/lib/validators) because they describe HTTP transport,
 * not domain validation.
 */

export type ApiSuccess<T> = { data: T };

export type ApiPaginated<T> = {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    errors?: Record<string, string[]>;
    requestId?: string;
  };
};
