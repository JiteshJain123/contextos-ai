"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TaskDTO, TaskStatus } from "@/lib/validators/task";

import { queryKeys } from "@/lib/query-keys";

import { taskApi } from "../api/task.api";

type MoveInput = { taskId: string; status: TaskStatus; position: number };

/**
 * Optimistic drag-drop mutation.
 *
 * Lifecycle:
 *   1. onMutate         — write through to the cache instantly (no spinner)
 *   2. mutationFn       — PATCH /tasks/:id/status fires in the background
 *   3. onError          — rollback the cache to the snapshot
 *   4. onSettled        — invalidate so the next refetch picks up server truth
 *
 * The user feels zero latency on a successful drag. Failures snap the card
 * back to where it was AND show a toast.
 */
export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.task.byProject(projectId);

  return useMutation({
    mutationFn: ({ taskId, status, position }: MoveInput) =>
      taskApi.updateStatus(taskId, { status, position }),

    onMutate: async ({ taskId, status, position }) => {
      // Cancel any in-flight refetch so it doesn't overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskDTO[]>(queryKey);

      queryClient.setQueryData<TaskDTO[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((t) => (t.id === taskId ? { ...t, status, position } : t));
      });

      // Returned context is passed to onError for rollback.
      return { previous };
    },

    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(err instanceof Error ? err.message : "Failed to move task");
    },

    onSettled: () => {
      // Reconcile with server state regardless of success/failure.
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
