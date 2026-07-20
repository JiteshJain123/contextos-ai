"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query-keys";
import { planApi } from "../api/plan.api";

/**
 * Manages the streaming plan generation flow.
 *
 * Exposes:
 *   generate(goal)       — start streaming plan generation
 *   streamingContent     — partial markdown accumulating in real-time
 *   isGenerating         — true while the SSE stream is open
 *   generateError        — last error message, cleared on next generate
 *   tasksSavedCount      — number of tasks written to DB (set on tasks_saved event)
 */
export function useGeneratePlan(projectId: string) {
  const queryClient = useQueryClient();

  const [streamingContent, setStreamingContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [tasksSavedCount, setTasksSavedCount] = useState<number | null>(null);

  const lastGoalRef = useRef<string>("");

  const generate = useCallback(
    async (goal: string) => {
      if (isGenerating) return;

      lastGoalRef.current = goal;
      setIsGenerating(true);
      setStreamingContent("");
      setGenerateError(null);
      setTasksSavedCount(null);

      try {
        for await (const event of planApi.generatePlan(projectId, goal)) {
          if (event.type === "chunk") {
            setStreamingContent((prev) => prev + event.content);
          } else if (event.type === "tasks_saved") {
            setTasksSavedCount(event.count);
            // Invalidate task board so new tasks appear immediately.
            await queryClient.invalidateQueries({
              queryKey: queryKeys.task.byProject(projectId),
            });
            if (event.count > 0) {
              toast.success(`${event.count} task${event.count === 1 ? "" : "s"} added to your board`);
            }
          } else if (event.type === "done") {
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plan.byProject(projectId),
            });
          } else if (event.type === "error") {
            const msg = event.message ?? "Plan generation failed";
            setGenerateError(msg);
            toast.error(msg);
          }
        }
      } catch {
        const msg = "Connection lost — please try again";
        setGenerateError(msg);
        toast.error(msg);
      } finally {
        setIsGenerating(false);
        setStreamingContent("");
      }
    },
    [isGenerating, projectId, queryClient],
  );

  const retry = useCallback(() => {
    if (lastGoalRef.current) {
      void generate(lastGoalRef.current);
    }
  }, [generate]);

  return { generate, retry, streamingContent, isGenerating, generateError, tasksSavedCount };
}
