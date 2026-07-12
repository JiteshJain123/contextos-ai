"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { authApi } from "../api/auth.api";

/**
 * Current user query.
 *
 * Returns `data: undefined` for unauthenticated visitors (401 → caught,
 * cached as null-equivalent). Components can branch on `data` to decide
 * whether to render auth-required UI.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    // The current user is loaded ONCE per session; revalidating on every focus
    // is unnecessary. Login/logout mutations invalidate this key explicitly.
    staleTime: Infinity,
  });
}
