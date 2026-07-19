"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import type { CreateProjectInput, ProjectDTO } from "@/lib/validators/project";

import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { projectApi } from "../api/project.api";

/**
 * Create-project mutation.
 *
 * On success: invalidate the projects list cache, show a toast, and call
 * the optional `onCreated` callback (used by the dialog to close itself).
 * On error: map ApiError to form-field errors when possible (slug validation
 * is the common case), else show a toast.
 */
export function useCreateProject(
  form: UseFormReturn<CreateProjectInput>,
  onCreated?: (project: ProjectDTO) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.create,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.project.lists() });
      toast.success(`Project "${project.name}" created`);
      onCreated?.(project);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, msgs] of Object.entries(err.fieldErrors)) {
          form.setError(field as never, { type: "server", message: msgs?.[0] ?? "Invalid" });
        }
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    },
  });
}
