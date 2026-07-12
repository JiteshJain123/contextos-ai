"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type {
  DocumentDTO,
  DocumentRequirement,
  DocumentDeadline,
  DocumentRisk,
  DocumentSuggestedTask,
} from "@contextos-ai/validators/document";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";

import { documentApi } from "../api/document.api";

// ── Severity helpers ──────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, { badge: string; dot: string }> = {
  CRITICAL: {
    badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    dot: "bg-red-500",
  },
  URGENT: {
    badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    dot: "bg-red-500",
  },
  HIGH: {
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  MEDIUM: {
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
    dot: "bg-yellow-400",
  },
  LOW: {
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.MEDIUM!;
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase shrink-0", style.badge)}>
      {priority}
    </span>
  );
}

function hasCritical(items: Array<{ priority?: string; severity?: string }>) {
  return items.some(
    (i) =>
      (i.priority === "CRITICAL" || i.priority === "URGENT" || i.priority === "HIGH") ||
      (i.severity === "CRITICAL" || i.severity === "HIGH"),
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  count,
  children,
  accent,
  headerAccent,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  count?: number;
  children: React.ReactNode;
  accent: string;
  headerAccent?: string;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", headerAccent ? "border-border" : "border-border")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/30",
          headerAccent,
        )}
      >
        <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", accent)}>
          <Icon className="size-3.5" />
        </div>
        <span className="flex-1 text-sm font-semibold">{title}</span>
        {badge}
        {count !== undefined && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {count}
          </span>
        )}
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Task import panel ─────────────────────────────────────────────────────────

interface TaskImportPanelProps {
  projectId: string;
  docId: string;
  tasks: DocumentSuggestedTask[];
}

function TaskImportPanel({ projectId, docId, tasks }: TaskImportPanelProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const toggleAll = () => {
    setSelected(selected.size === tasks.length ? new Set() : new Set(tasks.map((_, i) => i)));
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleImport = async () => {
    if (selected.size === 0) { toast.error("Select at least one task"); return; }
    setIsImporting(true);
    try {
      const created = await documentApi.importTasks(projectId, docId, {
        taskIndices: Array.from(selected),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.task.byProject(projectId) });
      toast.success(`${created.length} task${created.length === 1 ? "" : "s"} added to board`);
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <CheckSquare className="size-3.5" />
          {selected.size === tasks.length ? "Deselect all" : "Select all"}
        </button>
        <span className="text-[11px] text-muted-foreground">
          {selected.size}/{tasks.length} selected
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {tasks.map((task, i) => {
          const style = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.MEDIUM!;
          const isSelected = selected.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-all",
                isSelected
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-border/80 hover:bg-muted/20",
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30",
                )}
              >
                {isSelected && (
                  <svg viewBox="0 0 8 8" className="size-2.5 text-primary-foreground">
                    <polyline points="1,4 3,6 7,2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", style.dot)}
                  />
                  <span className="text-sm font-medium">{task.title}</span>
                  <PriorityBadge priority={task.priority} />
                  {task.dueDate && (
                    <span className="text-[10px] text-muted-foreground">
                      Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Button
        size="sm"
        onClick={handleImport}
        disabled={selected.size === 0 || isImporting}
        className="mt-1 w-full gap-1.5 text-sm"
      >
        {isImporting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        {isImporting
          ? "Adding to board…"
          : `Add ${selected.size > 0 ? selected.size : ""} task${selected.size === 1 ? "" : "s"} to board`}
      </Button>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface DocumentAnalysisPanelProps {
  projectId: string;
  document: DocumentDTO;
  onReanalyze: () => void;
  onGeneratePlan: () => void;
  isAnalyzing: boolean;
  streamingContent: string;
  analysisStage: string | null;
}

export function DocumentAnalysisPanel({
  projectId,
  document,
  onReanalyze,
  onGeneratePlan,
  isAnalyzing,
  streamingContent,
  analysisStage,
}: DocumentAnalysisPanelProps) {
  const isReady = document.status === "READY";
  const requirements = (document.requirements as DocumentRequirement[] | null) ?? null;
  const deadlines = (document.deadlines as DocumentDeadline[] | null) ?? null;
  const risks = (document.risks as DocumentRisk[] | null) ?? null;
  const suggestedTasks = (document.suggestedTasks as DocumentSuggestedTask[] | null) ?? null;

  // ── Analyzing state ───────────────────────────────────────────────────────

  if (isAnalyzing) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">
              {analysisStage === "extracting"
                ? "Extracting document text…"
                : analysisStage === "analyzing"
                  ? "AI is reading and analyzing…"
                  : analysisStage === "saving"
                    ? "Saving results…"
                    : "Processing…"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Takes 10–30 seconds
            </p>
          </div>
        </div>

        {streamingContent && (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Live output</p>
            <div className="max-h-40 overflow-y-auto font-mono text-xs text-muted-foreground">
              {streamingContent.slice(0, 500)}
              <span className="ml-0.5 animate-pulse">▋</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Not yet analyzed ──────────────────────────────────────────────────────

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Sparkles className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Not yet analyzed</h3>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            AI will extract requirements, deadlines, risks, and generate actionable tasks from this document.
          </p>
        </div>
        <Button size="sm" onClick={onReanalyze} className="gap-1.5 text-xs">
          <Sparkles className="size-3.5" />
          Analyze document
        </Button>
      </div>
    );
  }

  // ── Compute urgency for section ordering ──────────────────────────────────

  const hasHighRisk = risks ? hasCritical(risks.map((r) => ({ severity: r.severity }))) : false;
  const hasHighReq = requirements ? hasCritical(requirements.map((r) => ({ priority: r.priority }))) : false;
  const now = new Date();
  const hasPastDue = deadlines?.some((d) => d.date && new Date(d.date) < now) ?? false;

  // ── Analysis results ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Analysis</h3>
          {document.processedAt && (
            <span className="text-[10px] text-muted-foreground/50">
              {new Date(document.processedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            onClick={onGeneratePlan}
            className="h-7 gap-1.5 text-xs"
          >
            <Sparkles className="size-3.5" />
            Generate Plan
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReanalyze}
            className="h-7 gap-1 text-xs text-muted-foreground"
          >
            <RefreshCw className="size-3" />
            Re-analyze
          </Button>
        </div>
      </div>

      {/* Summary — always visible, prominent */}
      {document.summary && (
        <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="size-3.5 text-blue-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Summary
            </p>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-foreground/80">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.summary}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Risks — shown first if CRITICAL/HIGH present */}
      {risks && risks.length > 0 && (
        <Section
          title="Risks & Blockers"
          icon={AlertTriangle}
          count={risks.length}
          accent={hasHighRisk ? "bg-red-500/15 text-red-500" : "bg-orange-500/10 text-orange-500"}
          headerAccent={hasHighRisk ? "bg-red-50/40 dark:bg-red-950/10" : undefined}
          badge={
            hasHighRisk ? (
              <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                <XCircle className="size-2.5" />
                Needs attention
              </span>
            ) : undefined
          }
          defaultOpen={hasHighRisk}
        >
          <ul className="flex flex-col gap-2.5">
            {[...risks]
              .sort((a, b) => {
                const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                return (order[a.severity as keyof typeof order] ?? 2) - (order[b.severity as keyof typeof order] ?? 2);
              })
              .map((risk, i) => {
                const isCritical = risk.severity === "CRITICAL" || risk.severity === "HIGH";
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border-l-2 py-1 pl-3",
                      isCritical ? "border-red-400 bg-red-50/30 dark:bg-red-950/10" : "border-amber-300 bg-amber-50/20 dark:bg-amber-950/10",
                    )}
                  >
                    <AlertCircle
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        risk.severity === "CRITICAL" ? "text-red-500" : risk.severity === "HIGH" ? "text-orange-500" : "text-yellow-500",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm">{risk.description}</p>
                        <PriorityBadge priority={risk.severity} />
                      </div>
                      {risk.mitigation && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium">Fix:</span> {risk.mitigation}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </Section>
      )}

      {/* Deadlines */}
      {deadlines && deadlines.length > 0 && (
        <Section
          title="Deadlines & Milestones"
          icon={Calendar}
          count={deadlines.length}
          accent={hasPastDue ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500"}
          badge={
            hasPastDue ? (
              <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                Overdue
              </span>
            ) : undefined
          }
          defaultOpen
        >
          <ul className="flex flex-col gap-2">
            {deadlines.map((d, i) => {
              const isPast = d.date ? new Date(d.date) < now : false;
              return (
                <li key={i} className="flex items-start gap-2">
                  <Calendar className={cn("mt-0.5 size-3.5 shrink-0", isPast ? "text-red-500" : "text-orange-500")} />
                  <div className="flex-1">
                    <p className="text-sm">{d.description}</p>
                    {d.date && (
                      <p className={cn("mt-0.5 text-xs", isPast ? "font-medium text-red-500" : "text-muted-foreground")}>
                        {d.isEstimated && "~"}
                        {new Date(d.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        {isPast && " — past due"}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Requirements */}
      {requirements && requirements.length > 0 && (
        <Section
          title="Requirements"
          icon={Target}
          count={requirements.length}
          accent={hasHighReq ? "bg-violet-500/10 text-violet-500" : "bg-violet-500/10 text-violet-500"}
          badge={
            hasHighReq ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
                {requirements.filter((r) => r.priority === "CRITICAL" || r.priority === "HIGH").length} high-priority
              </span>
            ) : undefined
          }
          defaultOpen={!hasHighRisk}
        >
          <ul className="flex flex-col gap-2">
            {[...requirements]
              .sort((a, b) => {
                const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                return (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2);
              })
              .map((req, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs text-muted-foreground/40 shrink-0 tabular-nums w-4">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{req.text}</p>
                  </div>
                  <PriorityBadge priority={req.priority} />
                </li>
              ))}
          </ul>
        </Section>
      )}

      {/* Suggested tasks */}
      {suggestedTasks && suggestedTasks.length > 0 && (
        <Section
          title="Suggested Tasks"
          icon={CheckSquare}
          count={suggestedTasks.length}
          accent="bg-emerald-500/10 text-emerald-500"
          defaultOpen
        >
          <TaskImportPanel projectId={projectId} docId={document.id} tasks={suggestedTasks} />
        </Section>
      )}

      {/* Empty analysis fallback */}
      {!document.summary && !requirements?.length && !deadlines?.length && !risks?.length && !suggestedTasks?.length && (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">No structured data extracted.</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Try re-analyzing or check that the document contains readable text.
          </p>
        </div>
      )}
    </div>
  );
}
