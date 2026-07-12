"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query-keys";

import { projectApi } from "../api/project.api";

/**
 * Delete-project mutation. Invalidates the list cache and any cached detail.
 */
export function useDeleteProject(onDeleted?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.delete,
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.project.lists() });
      queryClient.removeQueries({ queryKey: queryKeys.project.detail(id) });
      toast.success("Project deleted");
      onDeleted?.();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
    },
  });
}
