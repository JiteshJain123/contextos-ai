"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { aiApi } from "../api/ai.api";

export function useConversations(projectId: string) {
  return useQuery({
    queryKey: queryKeys.ai.conversations(projectId),
    queryFn: () => aiApi.listConversations(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
