import { useQuery } from "@tanstack/react-query";
import type { InsightDTO, InsightType } from "@/lib/validators/insight";

import { queryKeys } from "@/lib/query-keys";
import { insightApi } from "../api/insight.api";

export function useInsights(projectId: string) {
  return useQuery<InsightDTO[]>({
    queryKey: queryKeys.insight.byProject(projectId),
    queryFn: () => insightApi.listInsights(projectId),
    staleTime: 120_000,
    select: (data) => data ?? [],
  });
}

/** Returns the cached insight for a specific type (or null). */
export function useInsightByType(
  projectId: string,
  type: InsightType,
): InsightDTO | null {
  const { data } = useInsights(projectId);
  return data?.find((i) => i.type === type) ?? null;
}
