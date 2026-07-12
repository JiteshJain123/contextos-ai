import { useQuery } from "@tanstack/react-query";
import type { PlanDTO } from "@contextos-ai/validators/plan";

import { queryKeys } from "@/lib/query-keys";
import { planApi } from "../api/plan.api";

export function usePlan(projectId: string) {
  return useQuery<PlanDTO | null>({
    queryKey: queryKeys.plan.byProject(projectId),
    queryFn: () => planApi.getPlan(projectId),
    staleTime: 60_000,
  });
}
