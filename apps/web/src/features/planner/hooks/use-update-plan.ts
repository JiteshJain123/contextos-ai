import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlanDTO, UpdatePlanInput } from "@contextos-ai/validators/plan";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query-keys";
import { planApi } from "../api/plan.api";

export function useUpdatePlan(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<PlanDTO, Error, UpdatePlanInput>({
    mutationFn: (data) => planApi.updatePlan(projectId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.plan.byProject(projectId), updated);
      toast.success("Roadmap saved");
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to save roadmap");
    },
  });
}
