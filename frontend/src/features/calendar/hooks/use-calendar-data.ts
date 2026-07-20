"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { calendarApi } from "../api/calendar.api";

export function useCalendarData(projectId: string) {
  return useQuery({
    queryKey: queryKeys.calendar.byProject(projectId),
    queryFn: () => calendarApi.getCalendarData(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}
