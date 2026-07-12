"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { documentApi } from "../api/document.api";

export function useDocuments(projectId: string) {
  return useQuery({
    queryKey: queryKeys.document.byProject(projectId),
    queryFn: () => documentApi.listDocuments(projectId),
    enabled: !!projectId,
  });
}

export function useDocument(projectId: string, docId: string) {
  return useQuery({
    queryKey: queryKeys.document.detail(docId),
    queryFn: () => documentApi.getDocument(projectId, docId),
    enabled: !!projectId && !!docId,
  });
}

export function useDeleteDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (docId: string) => documentApi.deleteDocument(projectId, docId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.document.byProject(projectId),
      });
    },
  });
}
