"use client";

import {
  Brain,
  FileText,
  MessageSquare,
  Lightbulb,
  ListChecks,
  Map,
  Users,
  Zap,
  Clock,
  Database,
  RefreshCw,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { motion } from "motion/react";
import type { ProjectMemoryDTO } from "@/lib/validators/memory";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useRebuildMemory } from "../hooks/use-rebuild-memory";
import { useClearMemory } from "../hooks/use-memory";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Confidence indicator ──────────────────────────────────────────────────────

function ConfidenceRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex size-20 items-center justify-center">
      <svg className="absolute -rotate-90" width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40" cy="40" r={radius}
          fill="none" stroke="currentColor"
          strokeWidth="6" className="text-muted/30"
        />
        <motion.circle
          cx="40" cy="40" r={radius}
          fill="none" stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="flex flex-col items-center leading-none">
        <span className="text-lg font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground">%</span>
      </div>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  color = "text-muted-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <Icon className={cn("size-3.5 shrink-0", color)} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ml-auto text-xs font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// ── Rebuild progress bar ──────────────────────────────────────────────────────

function RebuildProgressBar({
  stage,
  message,
  progress,
}: {
  stage: string;
  message: string;
  progress: number;
}) {
  if (stage === "idle") return null;

  const stageColors: Record<string, string> = {
    gathering: "bg-blue-500",
    chunking: "bg-violet-500",
    embedding: "bg-amber-500",
    saving: "bg-emerald-500",
    done: "bg-green-500",
    error: "bg-red-500",
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{message}</span>
        <span className="text-xs font-medium tabular-nums">{progress}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("h-full rounded-full", stageColors[stage] ?? "bg-primary")}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MemoryStatsPanelProps {
  projectId: string;
  memory: ProjectMemoryDTO | null;
  isLoading: boolean;
}

// ── Main component ────────────────────────────────────────────────────────────

export function MemoryStatsPanel({ projectId, memory, isLoading }: MemoryStatsPanelProps) {
  const { rebuild, isRebuilding, progress } = useRebuildMemory(projectId);
  const clearMutation = useClearMemory(projectId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Brain className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">AI Memory</h2>
          <p className="text-xs text-muted-foreground">Project knowledge base</p>
        </div>
      </div>

      {/* No memory state */}
      {!memory && !isRebuilding && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Database className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">No memory built yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground max-w-[220px]">
              Build memory to enable semantic search and AI context injection across all project data.
            </p>
          </div>
          <Button size="sm" onClick={() => void rebuild()} className="gap-1.5">
            <Brain className="size-3.5" />
            Build Memory
          </Button>
        </div>
      )}

      {/* Rebuild progress */}
      {(isRebuilding || progress.stage !== "idle") && (
        <RebuildProgressBar
          stage={progress.stage}
          message={progress.message}
          progress={progress.progress}
        />
      )}

      {/* Memory snapshot */}
      {memory && (
        <>
          {/* Confidence + freshness */}
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <ConfidenceRing score={memory.confidenceScore} />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">AI Confidence</p>
              <div className="flex items-center gap-1.5">
                {memory.isFresh ? (
                  <>
                    <Zap className="size-3 text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      Fresh
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="size-3 text-amber-500" />
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Stale
                    </span>
                  </>
                )}
                <span className="text-xs text-muted-foreground">
                  · built {formatRelativeTime(memory.builtAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {memory.totalChunks} indexed chunks · v{memory.snapshotVersion}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Indexed Knowledge
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              <StatPill
                icon={ListChecks}
                label="Tasks"
                value={memory.tasks.length}
                color="text-blue-500"
              />
              <StatPill
                icon={FileText}
                label="Documents"
                value={memory.documents.length}
                color="text-violet-500"
              />
              <StatPill
                icon={Lightbulb}
                label="AI Insights"
                value={memory.insights.length}
                color="text-amber-500"
              />
              <StatPill
                icon={MessageSquare}
                label="Conversations"
                value={memory.conversations.length}
                color="text-pink-500"
              />
              {memory.planSummary && (
                <StatPill
                  icon={Map}
                  label="Project Plan"
                  value="✓"
                  color="text-emerald-500"
                />
              )}
              {memory.teamMembers.length > 0 && (
                <StatPill
                  icon={Users}
                  label="Team Members"
                  value={memory.teamMembers.length}
                  color="text-cyan-500"
                />
              )}
            </div>
          </div>

          {/* Metrics summary */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">Project Health</p>
            <div className="flex flex-col gap-1">
              {[
                { label: "Completion", value: `${memory.metrics.completionRate}%` },
                { label: "Overdue Tasks", value: memory.metrics.overdueTasks },
                { label: "Critical Issues", value: memory.metrics.criticalInsights },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      row.label === "Overdue Tasks" && Number(row.value) > 0
                        ? "text-red-500"
                        : "text-foreground",
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Warning if stale */}
          {!memory.isFresh && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Memory is over 30 minutes old. Rebuild to refresh AI context.
              </p>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-1.5 pt-1">
        <Button
          size="sm"
          variant={memory ? "outline" : "default"}
          onClick={() => void rebuild()}
          disabled={isRebuilding}
          className="w-full gap-1.5"
        >
          <RefreshCw className={cn("size-3.5", isRebuilding && "animate-spin")} />
          {isRebuilding ? "Building…" : memory ? "Rebuild Memory" : "Build Memory"}
        </Button>

        {memory && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="w-full gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Clear Memory
          </Button>
        )}
      </div>
    </div>
  );
}
