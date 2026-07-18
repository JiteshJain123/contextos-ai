import "server-only";

import { auth } from "@clerk/nextjs/server";

import { clientEnv } from "@/env/client";

/**
 * Server-side fetch with Clerk auth token forwarding.
 *
 * Gets the current Clerk session token from auth() and passes it as
 * Authorization: Bearer to the Express API. Safe to call from any
 * Server Component or Route Handler.
 */
const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;

export class BackendUnavailableError extends Error {
  constructor() {
    super("Backend is unreachable");
    this.name = "BackendUnavailableError";
  }
}

export async function serverFetch<T>(path: string): Promise<T | null> {
  const { getToken } = await auth();
  const token = await getToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      cache: "no-store",
    });
  } catch {
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
