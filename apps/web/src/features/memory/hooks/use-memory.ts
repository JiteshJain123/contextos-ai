import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { memoryApi } from "../api/memory.api";

export function useMemory(projectId: string) {
  return useQuery({
    queryKey: queryKeys.memory.byProject(projectId),
    queryFn: () => memoryApi.getMemory(projectId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

export function useClearMemory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => memoryApi.clearMemory(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memory.byProject(projectId) });
      toast.success("Memory cleared — rebuild to refresh AI knowledge");
    },
    onError: () => toast.error("Failed to clear memory"),
  });
}
