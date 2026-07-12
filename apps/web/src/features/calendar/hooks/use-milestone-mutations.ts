"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { CreateMilestoneInput, UpdateMilestoneInput } from "@contextos-ai/validators/milestone";
import { queryKeys } from "@/lib/query-keys";
import { calendarApi } from "../api/calendar.api";

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMilestoneInput) =>
      calendarApi.createMilestone(projectId, input),
    onSuccess: async (milestone) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.milestone.byProject(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.calendar.byProject(projectId) }),
      ]);
      toast.success(`Milestone "${milestone.title}" created`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create milestone");
    },
  });
}

export function useUpdateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ milestoneId, input }: { milestoneId: string; input: UpdateMilestoneInput }) =>
      calendarApi.updateMilestone(milestoneId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.milestone.byProject(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.calendar.byProject(projectId) }),
      ]);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update milestone");
    },
  });
}

export function useDeleteMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (milestoneId: string) => calendarApi.deleteMilestone(milestoneId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.milestone.byProject(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.calendar.byProject(projectId) }),
      ]);
      toast.success("Milestone deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete milestone");
    },
  });
}
