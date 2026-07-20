"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { calendarApi } from "../api/calendar.api";

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: queryKeys.milestone.byProject(projectId),
    queryFn: () => calendarApi.listMilestones(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}
