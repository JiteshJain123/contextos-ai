import "server-only";

import { cookies } from "next/headers";

import { clientEnv } from "@/env/client";

/**
 * Server-side fetch with auth-cookie forwarding.
 *
 * Server Components don't run in the browser — they don't have automatic
 * cookie passthrough. This helper extracts the request's cookies from
 * `next/headers` and forwards them to the backend, so /auth/me, /users/:id,
 * etc. work the same way they do from the browser.
 *
 * `server-only` import guarantees this file CANNOT be bundled into the
 * client — a typo importing it from a Client Component breaks the build.
 *
 * Why `clientEnv` (not server env): the API URL is `NEXT_PUBLIC_API_URL` —
 * declared in the client schema because it's also needed in the browser.
 * It's perfectly safe to read NEXT_PUBLIC_* values from server code; the
 * server schema doesn't include them only because they're already validated
 * by the client schema and shouldn't be duplicated.
 *
 * Throws `BackendUnavailableError` when the backend is unreachable so that
 * callers can distinguish "not found / unauthorized" (null) from "network
 * error" (exception) and render degraded UIs instead of blank pages.
 */
const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;

export class BackendUnavailableError extends Error {
  constructor() {
    super("Backend is unreachable");
    this.name = "BackendUnavailableError";
  }
}

export async function serverFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      // Server-side fetches default to cache: "force-cache"; for authenticated
      // endpoints we always want fresh data per request.
      cache: "no-store",
    });
  } catch {
    // Network error — backend unreachable (ECONNREFUSED, DNS failure, etc.).
    // Throw a typed error so the dashboard layout can render in degraded mode
    // instead of redirecting to login (which would create a redirect loop).
    throw new BackendUnavailableError();
  }

  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    const err = new Error(`Server fetch failed: ${response.status} ${response.statusText}`);
    (err as NodeJS.ErrnoException).code = String(response.status);
    throw err;
  }

  const envelope = (await response.json()) as { data: T };
  return envelope.data;
}
