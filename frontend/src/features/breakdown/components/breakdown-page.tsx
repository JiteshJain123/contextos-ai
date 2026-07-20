"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, ArrowRight, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/query-keys";
import { useBreakdownV2 } from "../hooks/use-breakdown-v2";
import { GoalInputStep } from "./goal-input-step";
import { StreamingProgress } from "./streaming-progress";
import { ReviewShell } from "./review-shell";
import { ConfirmImportStep } from "./confirm-import-step";

interface BreakdownPageProps {
  projectId: string;
  slug: string;
}

const STEP_LABELS = ["1. Goal", "2. Review", "3. Import"];

export function BreakdownPage({ projectId, slug }: BreakdownPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bd = useBreakdownV2(projectId);

  const stepIndex = bd.step === "goal" ? 0 : bd.step === "review" ? 1 : 2;

  async function handleImport(): Promise<boolean> {
    const ok = await bd.importTasks();
    if (ok) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.byProject(projectId) });
      toast.success(`${bd.selectedTasks.length} task${bd.selectedTasks.length === 1 ? "" : "s"} added to your board`);
      router.push(`/projects/${slug}`);
    }
    return ok;
  }

  return (
    <div className="flex min-h-0 flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="size-4 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">AI Task Breakdown</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe your goal and the AI will generate a structured execution plan with sprint roadmap and dependency graph.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                i < stepIndex
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : i === stepIndex
                    ? "border-2 border-primary text-primary"
                    : "border border-muted-foreground/25 text-muted-foreground/40"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs font-medium ${i === stepIndex ? "text-foreground" : "text-muted-foreground/60"}`}
            >
              {label.slice(3)}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <ArrowRight className="size-3 text-muted-foreground/25 mx-0.5" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {bd.step === "goal" && (
        <div className="flex flex-col gap-4">
          <GoalInputStep
            isGenerating={bd.phase === "generating"}
            onGenerate={bd.generate}
            sprintStart={bd.sprintStart}
            onSprintStartChange={bd.setSprintStart}
          />
          <StreamingProgress
            taskCount={bd.tasks.length}
            isGenerating={bd.phase === "generating"}
          />
        </div>
      )}

      {bd.step === "review" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {bd.selectedTasks.length} of {bd.tasks.length} tasks selected
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={bd.goToGoal} className="gap-1.5">
                <ArrowLeft className="size-3.5" />
                New goal
              </Button>
              <Button
                size="sm"
                onClick={bd.goToConfirm}
                disabled={bd.selectedTasks.length === 0}
                className="gap-1.5"
              >
                Review import
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
          <ReviewShell
            tasks={bd.tasks}
            viewMode={bd.viewMode}
            setViewMode={bd.setViewMode}
            sprintWindows={bd.sprintWindows}
            onToggle={bd.toggleTask}
            onUpdate={bd.updateTask}
            taskMeta={bd.taskMeta}
            sprintLoads={bd.sprintLoads}
            sprintConflicts={bd.sprintConflicts}
            circularDeps={bd.circularDeps}
            depBlockedCount={bd.depBlockedCount}
            onRebalance={bd.rebalanceSprints}
          />
        </div>
      )}

      {bd.step === "confirm" && (
        <ConfirmImportStep
          tasks={bd.tasks}
          selectedTasks={bd.selectedTasks}
          onImport={handleImport}
          onBack={bd.goToReview}
          isImporting={bd.isImporting}
          importError={bd.importError}
        />
      )}
    </div>
  );
}
