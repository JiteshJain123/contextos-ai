"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { aiApi } from "../api/ai.api";

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.ai.messages(conversationId ?? ""),
    queryFn: () => aiApi.listMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    gcTime: 5 * 60 * 1_000,
  });
}
