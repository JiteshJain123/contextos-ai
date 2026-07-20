"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query-keys";

import { aiApi } from "../api/ai.api";

export function useDeleteConversation(projectId: string, onDeleted?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => aiApi.deleteConversation(conversationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.ai.conversations(projectId),
      });
      toast.success("Conversation deleted");
      onDeleted?.();
    },
    onError: () => {
      toast.error("Failed to delete conversation");
    },
  });
}
