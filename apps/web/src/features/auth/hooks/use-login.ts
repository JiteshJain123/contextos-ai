"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import type { LoginInput } from "@contextos-ai/validators/auth";

import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { authApi } from "../api/auth.api";

/**
 * Login mutation.
 *
 * Side effects on success:
 *   - Invalidate the /auth/me cache so the new user is fetched
 *   - Navigate to ?redirect (preserved by middleware) or /dashboard
 *
 * Error handling:
 *   - 4xx with field errors → setError on the form (errors render in-place)
 *   - 4xx without field errors → toast (e.g. 401 "Invalid email or password")
 *   - 5xx → toast "Something went wrong"
 *
 * Returning a typed `submit` keeps the LoginForm zero-logic.
 */
export function useLogin(form: UseFormReturn<LoginInput>) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      const redirectTo = searchParams.get("redirect") ?? "/dashboard";
      // Hard navigation ensures the browser sends the newly-set auth cookie
      // with the next request so the edge proxy can see it immediately.
      window.location.href = redirectTo;
    },
    onError: (err) => {
      mapApiErrorToForm(err, form);
    },
  });

  const submit = useCallback((values: LoginInput) => mutation.mutate(values), [mutation]);

  return { submit, isPending: mutation.isPending };
}

/**
 * Helper: map an ApiError to react-hook-form's setError plus optional toast.
 * Exported for reuse by useSignup.
 */
export function mapApiErrorToForm<T extends Record<string, unknown>>(
  err: unknown,
  form: UseFormReturn<T>,
) {
  if (!(err instanceof ApiError)) {
    toast.error("Something went wrong. Please try again.");
    return;
  }

  // Per-field validation errors from @contextos-ai/validators/parse
  if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
    for (const [field, messages] of Object.entries(err.fieldErrors)) {
      form.setError(field as never, {
        type: "server",
        message: messages?.[0] ?? "Invalid value",
      });
    }
    return;
  }

  // 401 / 403 / 409 — surface the server's user-friendly message
  if (err.status >= 400 && err.status < 500) {
    toast.error(err.message);
    return;
  }

  // 5xx — never expose internal details
  toast.error("Something went wrong on our end. Please try again.");
}
