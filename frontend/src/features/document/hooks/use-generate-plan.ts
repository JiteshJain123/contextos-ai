"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { DocumentPlan } from "@/lib/validators/document";
import { documentApi } from "../api/document.api";

export type PlanGenerationState =
  | { status: "idle" }
  | { status: "generating"; message: string }
  | { status: "ready"; plan: DocumentPlan }
  | { status: "error"; message: string };

export function useGeneratePlan(projectId: string) {
  const [state, setState] = useState<PlanGenerationState>({ status: "idle" });

  const generate = useCallback(
    async (docId: string) => {
      setState({ status: "generating", message: "Generating project plan…" });

      try {
        let finalPlan: DocumentPlan | null = null;

        for await (const event of documentApi.generatePlan(projectId, docId)) {
          if (event.type === "plan_progress") {
            setState({ status: "generating", message: event.message });
          } else if (event.type === "plan_done") {
            finalPlan = event.plan;
          } else if (event.type === "plan_error") {
            setState({ status: "error", message: event.message });
            toast.error(event.message);
            return;
          }
        }

        if (finalPlan) {
          setState({ status: "ready", plan: finalPlan });
        } else {
          setState({ status: "error", message: "No plan returned from AI" });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Plan generation failed";
        setState({ status: "error", message });
        toast.error(message);
      }
    },
    [projectId],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, generate, reset };
}
