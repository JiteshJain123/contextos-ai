"use client";

import { useMutation } from "@tanstack/react-query";

import { aiApi } from "../api/ai.api";

export function useSuggestTasks(projectId: string) {
  return useMutation({
    mutationFn: (prompt: string) => aiApi.suggestTasks(projectId, prompt),
  });
}
