/**
 * Standard JSON response envelopes.
 *
 * Every API response is one of:
 *
 *   Success:    { data: T }
 *   Paginated:  { data: T[], meta: { page, pageSize, total, hasNext } }
 *   Error:      { error: { code, message, details?, requestId } }
 *
 * Use the helpers below instead of constructing the envelope by hand at
 * each call site — keeps shapes consistent and future-proof (if we add
 * `meta.serverTime` or whatever later, one edit propagates everywhere).
 */

export type SuccessEnvelope<T> = { data: T };

export type PaginatedEnvelope<T> = {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
};

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    errors?: Record<string, string[]>;
    requestId?: string;
  };
};

/** Wrap a single resource: `res.json(ok(user))`. */
export function ok<T>(data: T): SuccessEnvelope<T> {
  return { data };
}

/** Wrap a created resource: `res.status(201).json(created(user))`. */
export function created<T>(data: T): SuccessEnvelope<T> {
  return { data };
}

/** Wrap a paginated list. Compute `hasNext` so clients don't recompute it. */
export function paginated<T>(
  items: T[],
  options: { page: number; pageSize: number; total: number },
): PaginatedEnvelope<T> {
  const { page, pageSize, total } = options;
  return {
    data: items,
    meta: {
      page,
      pageSize,
      total,
      hasNext: page * pageSize < total,
    },
  };
}
