"use client";

import { AlertCircle, CheckSquare, RefreshCw, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { usePlan } from "../hooks/use-plan";
import { useGeneratePlan } from "../hooks/use-generate-plan";
import { useUpdatePlan } from "../hooks/use-update-plan";
import { PlanGenerator } from "./plan-generator";
import { RoadmapViewer } from "./roadmap-viewer";

interface PlanPageProps {
  projectId: string;
}

export function PlanPage({ projectId }: PlanPageProps) {
  const planQuery = usePlan(projectId);
  const { generate, retry, streamingContent, isGenerating, generateError, tasksSavedCount } =
    useGeneratePlan(projectId);
  const updateMutation = useUpdatePlan(projectId);

  const plan = planQuery.data;
  const hasExistingPlan = !!plan;

  // While generating, show the streaming content (before plan is saved).
  const displayMarkdown = isGenerating ? streamingContent : (plan?.markdown ?? "");

  return (
    <div className="flex min-h-0 flex-col gap-6 p-4 sm:p-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">AI Project Planner</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe your goal and the AI will generate a full roadmap, milestones, and create tasks in your board.
        </p>
      </div>

      {/* Goal input */}
      <PlanGenerator
        initialGoal={plan?.goal}
        isGenerating={isGenerating}
        onGenerate={generate}
        hasPlan={hasExistingPlan}
      />

      {/* Tasks saved banner */}
      {tasksSavedCount !== null && tasksSavedCount > 0 && !isGenerating && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          <CheckSquare className="size-4 shrink-0" />
          <span>
            {tasksSavedCount} task{tasksSavedCount === 1 ? "" : "s"} added to your board automatically.
          </span>
        </div>
      )}

      {/* Stream error banner */}
      {generateError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{generateError}</span>
            <Button variant="outline" size="sm" onClick={retry} className="shrink-0 gap-1.5">
              <RefreshCw className="size-3" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {planQuery.isLoading && !isGenerating && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${60 + i * 10}%` }} />
          ))}
        </div>
      )}

      {/* Roadmap content */}
      {(displayMarkdown || isGenerating) && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          {hasExistingPlan && !isGenerating && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Current goal</p>
                <p className="mt-0.5 text-sm">{plan.goal}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Updated {new Date(plan.updatedAt).toLocaleDateString()}
              </p>
            </div>
          )}

          <RoadmapViewer
            markdown={displayMarkdown}
            isStreaming={isGenerating}
            onSave={hasExistingPlan ? (md) => updateMutation.mutate({ markdown: md }) : undefined}
            isSaving={updateMutation.isPending}
          />
        </div>
      )}

      {/* Empty state — no plan and not generating */}
      {!hasExistingPlan && !isGenerating && !planQuery.isLoading && !displayMarkdown && (
        <div className="relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-14 text-center">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/4 via-transparent to-transparent"
            aria-hidden="true"
          />
          <div className="relative flex size-12 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
            <Sparkles className="size-5 text-primary/70" aria-hidden="true" />
          </div>
          <div className="relative">
            <h3 className="text-sm font-semibold">No plan yet</h3>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
              Describe your goal above — the AI will generate a full roadmap with milestones and tasks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
