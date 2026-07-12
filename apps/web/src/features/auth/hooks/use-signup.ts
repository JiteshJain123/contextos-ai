"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { SignupInput } from "@contextos-ai/validators/auth";

import { queryKeys } from "@/lib/query-keys";

import { authApi } from "../api/auth.api";
import { mapApiErrorToForm } from "./use-login";

/**
 * Signup mutation. Same shape as useLogin — only the API call differs.
 */
export function useSignup(form: UseFormReturn<SignupInput>) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const mutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      const redirectTo = searchParams.get("redirect") ?? "/dashboard";
      window.location.href = redirectTo;
    },
    onError: (err) => {
      mapApiErrorToForm(err, form);
    },
  });

  const submit = useCallback((values: SignupInput) => mutation.mutate(values), [mutation]);

  return { submit, isPending: mutation.isPending };
}
