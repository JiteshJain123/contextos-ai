import { clientEnv } from "@/env/client";
import type { ApiErrorBody, ApiPaginated, ApiSuccess } from "@/types/api";

/**
 * Typed API client for talking to the Express backend.
 *
 * Auth: injects the Clerk session token as Authorization: Bearer on every
 * request. The token getter is set by ClerkTokenSync on mount.
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
  json?: unknown;
};

// ── Clerk token bridge ────────────────────────────────────────────────────────
// ClerkTokenSync calls setTokenGetter() on mount so every API call
// automatically gets the current session token without touching any hook.

type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;
let tokenGetterReady: (() => void) | null = null;
const tokenGetterPromise = new Promise<void>((resolve) => {
  tokenGetterReady = resolve;
});

export function setTokenGetter(fn: TokenGetter) {
  tokenGetter = fn;
  tokenGetterReady?.();
}

/** Returns the raw Bearer token string for SSE / raw fetch calls. */
export async function getAuthToken(): Promise<string | null> {
  if (!tokenGetter && typeof window !== "undefined") {
    await Promise.race([
      tokenGetterPromise,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }
  if (!tokenGetter) return null;
  return tokenGetter();
}

/**
 * Waits for ClerkTokenSync to register the token getter before the first
 * request fires. Without this, queries that mount before Clerk loads go out
 * unauthenticated, get a 401, and used to hard-redirect to /login — which the
 * middleware bounced straight back to the page, causing an infinite reload loop.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  if (!tokenGetter && typeof window !== "undefined") {
    await Promise.race([
      tokenGetterPromise,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }
  if (!tokenGetter) return {};
  const token = await tokenGetter();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Request helper ────────────────────────────────────────────────────────────

async function request<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
  const { json, headers, ...init } = options;
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeader,
      ...headers,
    },
    ...(json !== undefined && { body: JSON.stringify(json) }),
  });

  // 401: throw instead of hard-redirecting. Route protection is the
  // middleware's job — redirecting here caused reload loops when a request
  // raced Clerk initialization.
  if (response.status === 401) {
    throw new ApiError("Session expired — please log in again", 401, "UNAUTHORIZED");
  }

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // not JSON
    }
    throw new ApiError(
      body?.error.message ?? response.statusText,
      response.status,
      body?.error.code ?? "UNKNOWN",
      body?.error.errors,
      body?.error.requestId,
    );
  }

  if (response.status === 204) return undefined as TData;

  const envelope = (await response.json()) as ApiSuccess<TData> | ApiPaginated<TData>;
  return envelope.data as TData;
}

async function requestEnvelope<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccess<TData> | ApiPaginated<TData>> {
  const { json, headers, ...init } = options;
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeader,
      ...headers,
    },
    ...(json !== undefined && { body: JSON.stringify(json) }),
  });

  // 401: throw instead of hard-redirecting (see request() above).
  if (response.status === 401) {
    throw new ApiError("Session expired — please log in again", 401, "UNAUTHORIZED");
  }

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

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

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
