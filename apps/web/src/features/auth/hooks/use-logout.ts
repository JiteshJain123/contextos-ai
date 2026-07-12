"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authApi } from "../api/auth.api";

/**
 * Logout mutation.
 *
 * On success: clear ALL query caches (auth data is gone, and any cached
 * user-scoped data must be discarded) and route to /login. On failure,
 * still route — server-side logout is idempotent and the user clearly
 * wanted out.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
    onError: () => {
      toast.error("Logout had trouble, but you're signed out locally.");
    },
  });
}
