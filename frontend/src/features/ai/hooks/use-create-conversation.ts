"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ConversationDTO } from "@/lib/validators/ai";

import { queryKeys } from "@/lib/query-keys";

import { aiApi } from "../api/ai.api";

export function useCreateConversation(
  projectId: string,
  onCreated?: (conversation: ConversationDTO) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => aiApi.createConversation(projectId),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.ai.conversations(projectId),
      });
      onCreated?.(conversation);
    },
  });
}
