import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectHealthDTO } from "@/lib/validators/health";

import { queryKeys } from "@/lib/query-keys";
import { healthApi } from "../api/health.api";

export function useProjectHealth(projectId: string) {
  return useQuery<ProjectHealthDTO>({
    queryKey: queryKeys.health.byProject(projectId),
    queryFn: () => healthApi.getHealth(projectId),
    staleTime: 300_000,
    retry: false,
  });
}

export function useComputeHealth(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => healthApi.computeHealth(projectId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.health.byProject(projectId), data);
    },
  });
}
