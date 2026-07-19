"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TaskDTO, UpdateTaskInput } from "@/lib/validators/task";

import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { taskApi } from "../api/task.api";

type SetFieldError = (field: string, message: string) => void;

export function useUpdateTask(
  projectId: string,
  taskId: string,
  setFieldError: SetFieldError,
  onUpdated?: (task: TaskDTO) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTaskInput) => taskApi.update(taskId, input),
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.byProject(projectId) });
      toast.success("Task updated");
      onUpdated?.(task);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, msgs] of Object.entries(err.fieldErrors)) {
          setFieldError(field, msgs?.[0] ?? "Invalid");
        }
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    },
  });
}
