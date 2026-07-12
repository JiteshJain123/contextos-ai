"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { CreateTaskInput, TaskDTO } from "@contextos-ai/validators/task";

import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { taskApi } from "../api/task.api";

/**
 * Decoupled from the form's exact generic shape — accepts a minimal
 * `setFieldError` callback. This sidesteps the input-vs-output type
 * mismatch caused by `z.coerce.*` in the schema while keeping the
 * field-error mapping behavior intact.
 */
type SetFieldError = (field: string, message: string) => void;

export function useCreateTask(
  projectId: string,
  setFieldError: SetFieldError,
  onCreated?: (task: TaskDTO) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => taskApi.create(projectId, input),
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.byProject(projectId) });
      toast.success(`Task "${task.title}" created`);
      onCreated?.(task);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, msgs] of Object.entries(err.fieldErrors)) {
          setFieldError(field, msgs?.[0] ?? "Invalid");
        }
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    },
  });
}
