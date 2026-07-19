"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { taskApi } from "../api/task.api";

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: queryKeys.task.byProject(projectId),
    queryFn: () => taskApi.list(projectId),
    enabled: !!projectId,
  });
}
