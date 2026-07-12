"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { projectApi } from "../api/project.api";

/**
 * List the current user's projects (paginated).
 *
 * Returns the FULL envelope (data + meta) so consumers can render pagination
 * controls. The data is owner-scoped server-side.
 */
export function useProjects(params: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.project.list(params),
    queryFn: () => projectApi.list(params),
  });
}
