"use client";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { memoryApi } from "../api/memory.api";

export type RebuildStage = "idle" | "gathering" | "chunking" | "embedding" | "saving" | "done" | "error";

export interface RebuildProgress {
  stage: RebuildStage;
  message: string;
  progress: number; // 0-100
  totalChunks?: number;
}

export function useRebuildMemory(projectId: string) {
  const queryClient = useQueryClient();
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [progress, setProgress] = useState<RebuildProgress>({
    stage: "idle",
    message: "",
    progress: 0,
  });

  const rebuild = useCallback(async () => {
    if (isRebuilding) return;

    setIsRebuilding(true);
    setProgress({ stage: "gathering", message: "Starting rebuild…", progress: 0 });

    try {
      for await (const event of memoryApi.rebuild(projectId)) {
        if (event.type === "progress") {
          // Calculate progress percentage based on stage
          const stageProgress: Record<string, number> = {
            gathering: 10,
            chunking: 30,
            embedding: 85,
            saving: 95,
          };

          const baseProgress = stageProgress[event.stage] ?? 0;
          const embeddingProgress =
            event.stage === "embedding" && event.total && event.progress
              ? (event.progress / event.total) * 55 + 30 // 30-85%
              : baseProgress;

          setProgress({
            stage: event.stage,
            message: event.message,
            progress: Math.round(embeddingProgress),
          });
        } else if (event.type === "done") {
          setProgress({
            stage: "done",
            message: `Memory built — ${event.totalChunks} chunks indexed`,
            progress: 100,
            totalChunks: event.totalChunks,
          });
          await queryClient.invalidateQueries({
            queryKey: queryKeys.memory.byProject(projectId),
          });
          toast.success(`AI Memory rebuilt — ${event.totalChunks} knowledge chunks indexed`);
        } else if (event.type === "error") {
          setProgress({ stage: "error", message: event.message, progress: 0 });
          toast.error(`Memory rebuild failed: ${event.message}`);
          break;
        }
      }
    } catch (err) {
      setProgress({
        stage: "error",
        message: err instanceof Error ? err.message : "Rebuild failed",
        progress: 0,
      });
      toast.error("Memory rebuild failed");
    } finally {
      setIsRebuilding(false);
      // Reset to idle after 3 seconds on success
      setTimeout(() => {
        setProgress((prev) =>
          prev.stage === "done" || prev.stage === "error"
            ? { stage: "idle", message: "", progress: 0 }
            : prev,
        );
      }, 3000);
    }
  }, [projectId, isRebuilding, queryClient]);

  return { rebuild, isRebuilding, progress };
}
