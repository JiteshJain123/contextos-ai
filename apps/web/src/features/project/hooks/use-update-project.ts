"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ProjectDTO, UpdateProjectInput } from "@contextos-ai/validators/project";

import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { projectApi } from "../api/project.api";

type SetFieldError = (field: string, message: string) => void;

export function useUpdateProject(
  projectId: string,
  setFieldError: SetFieldError,
  onUpdated?: (project: ProjectDTO) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectInput) => projectApi.update(projectId, input),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.project.lists() });
      toast.success("Project updated");
      onUpdated?.(project);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, msgs] of Object.entries(err.fieldErrors)) {
          setFieldError(field, msgs?.[0] ?? "Invalid");
        }
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to update project");
    },
  });
}
