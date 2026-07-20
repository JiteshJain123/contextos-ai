import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InsightType } from "@/lib/validators/insight";

import { queryKeys } from "@/lib/query-keys";
import { insightApi } from "../api/insight.api";

export function useDismissInsight(projectId: string) {
  const queryClient = useQueryClient();

  const dismiss = useMutation({
    mutationFn: (type: InsightType) => insightApi.dismissInsight(projectId, type),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.insight.byProject(projectId),
      });
    },
  });

  const undismiss = useMutation({
    mutationFn: (type: InsightType) => insightApi.undismissInsight(projectId, type),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.insight.byProject(projectId),
      });
    },
  });

  return { dismiss, undismiss };
}
