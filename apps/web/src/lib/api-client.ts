import { clientEnv } from "@/env/client";
import type { ApiErrorBody, ApiPaginated, ApiSuccess } from "@/types/api";

/**
 * Typed API client for talking to the Express backend.
 *
 * Design notes:
 *   - Built on native fetch (zero runtime cost, works in Edge + Server Components).
 *   - `credentials: "include"` so HttpOnly auth cookies are sent and received.
 *   - Unwraps the `{ data }` envelope so callers get domain objects directly.
 *   - Throws `ApiError` on non-2xx so TanStack Query's `isError` works correctly.
 *   - 401 responses trigger a single silent token refresh attempt. If the
 *     refresh succeeds the original request is retried transparently. If it
 *     fails the user is redirected to /login with the current path preserved.
 */

const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string = "UNKNOWN",
    public readonly fieldErrors?: Record<string, string[]>,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  /** JSON body — serialized automatically. */
  json?: unknown;
};

// ── Silent token refresh ─────────────────────────────────────────────────────
//
// At most one refresh call is in-flight at a time. Concurrent requests that
// all receive a 401 (e.g. after an access-token expiry) share the same promise
// so only a single POST /auth/refresh is sent. Once the promise settles all
// queued callers retry with the new cookie.
//
// The promise is held at module scope — it persists across renders but is reset
// to null after each attempt (success or failure).

let refreshPromise: Promise<void> | null = null;

async function refreshTokens(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    // Refresh token is invalid or expired — the session is gone.
    // Redirect to /login preserving the intended destination so the user
    // lands back on the right page after re-authenticating.
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const redirect = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/login?redirect=${redirect}`;
      // Stall all pending promises while the browser navigates away.
      // This prevents error toasts from flashing before the redirect completes.
      await new Promise<never>(() => {});
    }
    throw new ApiError("Session expired — please log in again", 401, "UNAUTHORIZED");
  }
}

/**
 * Execute a fetch call. On 401, attempt a silent token refresh and retry once.
 * `isRetry = true` breaks the cycle — we never refresh more than once per
 * original request.
 */
async function executeWithRefresh(
  fetcher: () => Promise<Response>,
  isRetry = false,
): Promise<Response> {
  const response = await fetcher();

  if (response.status === 401 && !isRetry) {
    if (!refreshPromise) {
      refreshPromise = refreshTokens().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
    // After a successful refresh the browser has a new access-token cookie.
    // Retry the original request — pass isRetry=true so a second 401 throws.
    return executeWithRefresh(fetcher, true);
  }

  return response;
}

// ── Request helpers ──────────────────────────────────────────────────────────

async function request<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
  const { json, headers, ...init } = options;

  const fetcher = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      ...(json !== undefined && { body: JSON.stringify(json) }),
    });

  const response = await executeWithRefresh(fetcher);

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // Body wasn't JSON — fall back to status text.
    }
    throw new ApiError(
      body?.error.message ?? response.statusText,
      response.status,
      body?.error.code ?? "UNKNOWN",
      body?.error.errors,
      body?.error.requestId,
    );
  }

  // 204 No Content has no body.
  if (response.status === 204) return undefined as TData;

  const envelope = (await response.json()) as ApiSuccess<TData> | ApiPaginated<TData>;
  return envelope.data as TData;
}

/**
 * Lower-level request returning the FULL envelope (data + meta).
 * Used by paginated list endpoints where callers need the meta block.
 */
async function requestEnvelope<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccess<TData> | ApiPaginated<TData>> {
  const { json, headers, ...init } = options;

  const fetcher = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      ...(json !== undefined && { body: JSON.stringify(json) }),
    });

  const response = await executeWithRefresh(fetcher);

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      /* not JSON */
    }
    throw new ApiError(
      body?.error.message ?? response.statusText,
      response.status,
      body?.error.code ?? "UNKNOWN",
      body?.error.errors,
      body?.error.requestId,
    );
  }
  return (await response.json()) as ApiSuccess<TData> | ApiPaginated<TData>;
}

/**
 * Public API surface. Each method returns the unwrapped `data` payload.
 *
 * Usage:
 *   const user = await api.get<UserDTO>("/auth/me");
 *   await api.post("/auth/login", { email, password });
 *
 * For paginated endpoints that need the `meta` block, use `api.getPaginated`.
 */
export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  /** GET a paginated list — returns the full `{ data: T[], meta: {...} }` envelope. */
  getPaginated: <T>(path: string, options?: RequestOptions) =>
    requestEnvelope<T>(path, { ...options, method: "GET" }) as Promise<ApiPaginated<T>>,

  post: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", json }),

  put: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", json }),

  patch: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", json }),

  delete: <T = void>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
