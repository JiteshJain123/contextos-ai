"use client";

import { useState, useCallback, useEffect, useRef, type ElementType } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  EyeOff,
  RotateCcw,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InsightDTO, InsightType } from "@contextos-ai/validators/insight";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";

import { insightApi } from "../api/insight.api";
import { useDismissInsight } from "../hooks/use-dismiss-insight";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightConfig = {
  type: InsightType;
  title: string;
  description: string;
  icon: ElementType;
  accentClass: string;
  iconBgClass: string;
};

type StatusLevel = "HEALTHY" | "WARNING" | "CRITICAL";
type ParsedSection = { heading: string; content: string };
type ParsedInsight = { status: StatusLevel; sections: ParsedSection[] };

// ─── Centralized severity utilities ──────────────────────────────────────────

export type SeverityLevel = "healthy" | "warning" | "high" | "critical";

export function valueToSeverity(v: number): SeverityLevel {
  if (v >= 75) return "healthy";
  if (v >= 50) return "warning";
  if (v >= 30) return "high";
  return "critical";
}

export const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; textClass: string; bgClass: string; borderClass: string; dotClass: string }
> = {
  healthy: {
    label:       "Low Risk",
    textClass:   "text-green-700 dark:text-green-400",
    bgClass:     "bg-green-50 dark:bg-green-950/20",
    borderClass: "border-green-200 dark:border-green-800/40",
    dotClass:    "bg-green-500",
  },
  warning: {
    label:       "Med Risk",
    textClass:   "text-yellow-700 dark:text-yellow-400",
    bgClass:     "bg-yellow-50 dark:bg-yellow-950/20",
    borderClass: "border-yellow-200 dark:border-yellow-800/40",
    dotClass:    "bg-yellow-400",
  },
  high: {
    label:       "High Risk",
    textClass:   "text-red-600 dark:text-red-400",
    bgClass:     "bg-red-50 dark:bg-red-950/20",
    borderClass: "border-red-200 dark:border-red-800/40",
    dotClass:    "bg-red-500",
  },
  critical: {
    label:       "Critical",
    textClass:   "text-red-700 dark:text-red-300",
    bgClass:     "bg-red-100 dark:bg-red-950/40",
    borderClass: "border-red-300 dark:border-red-700/60",
    dotClass:    "bg-red-600",
  },
};

// ─── Contextual placeholder copy ──────────────────────────────────────────────

const PLACEHOLDER_COPY: Partial<Record<InsightType, { headline: string; sub: string }>> = {
  NEXT_TASK:             { headline: "Find your next best task",     sub: "AI picks the highest-impact work right now" },
  OVERDUE_TASKS:         { headline: "Review overdue items",         sub: "See what's late and how to recover" },
  DAILY_SUMMARY:         { headline: "Get your daily briefing",      sub: "What happened today and what's next" },
  WORKLOAD_PRIORITY:     { headline: "Prioritize your workload",     sub: "Rank tasks by urgency and impact" },
  BLOCKER_DETECTION:     { headline: "Scan for blockers",            sub: "Find what's slowing the project down" },
  SPRINT_IMPROVEMENTS:   { headline: "Improve your workflow",        sub: "Habits to get more done each sprint" },
  WEEKLY_SUMMARY:        { headline: "Review your week",             sub: "What you accomplished and what comes next" },
  OVERDUE_RECOVERY:      { headline: "Plan overdue recovery",        sub: "AI-generated plan to catch up on late tasks" },
  INACTIVE_PROJECT:      { headline: "Diagnose inactivity",          sub: "Understand why the project went quiet" },
  BLOCKED_WORKFLOW:      { headline: "Detect blocked workflows",     sub: "Find tasks stuck in review or waiting" },
  PRODUCTIVITY_SLOWDOWN: { headline: "Analyze productivity drop",    sub: "Understand the slowdown and fix it" },
  SPRINT_RISK:           { headline: "Assess sprint risk",           sub: "Will the current sprint hit its targets?" },
  OVERLOAD_WARNING:      { headline: "Check team capacity",          sub: "Detect who has too many tasks assigned" },
  STALE_CONTENT:         { headline: "Find stale content",           sub: "Plans or conversations that need a refresh" },
  DEPENDENCY_ANALYSIS:   { headline: "Map task dependencies",        sub: "AI infers which tasks block others from titles and descriptions" },
  BLOCKER_CHAIN:         { headline: "Detect blocker chains",        sub: "Find cascade failures: one stalled task blocking a chain of work" },
  SPRINT_FORECAST:       { headline: "Forecast sprint completion",   sub: "Predict which tasks will slip based on current velocity" },
  DELAY_IMPACT:          { headline: "Estimate delay cascades",      sub: "Model how missing a deadline ripples to downstream tasks" },
  WORKLOAD_IMBALANCE:    { headline: "Balance team workload",        sub: "Find who is overloaded, underloaded, or missing critical assignments" },
  STALL_ANALYSIS:        { headline: "Diagnose every stalled task",  sub: "Per-task diagnosis of idle work — why it stopped and exactly how to restart" },
  CRITICAL_PATH:         { headline: "Find the critical path",       sub: "Identify the task sequence whose delay most threatens the end date" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}

function isFresh(date: Date | string): boolean {
  return Date.now() - new Date(date).getTime() < 30 * 60_000;
}

function toPlain(markdown: string): string {
  return markdown.replace(/\*\*/g, "").replace(/\*/g, "").replace(/_/g, "").trim();
}

export function parseInsightStatus(content: string): StatusLevel {
  const lines = content.trim().split("\n");
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const line = lines[i]?.trim();
    if (line?.startsWith("STATUS:")) {
      const val = line.replace("STATUS:", "").trim().toUpperCase();
      if (val === "HEALTHY") return "HEALTHY";
      if (val === "CRITICAL") return "CRITICAL";
      return "WARNING";
    }
  }
  return "WARNING";
}

function parseInsight(markdown: string): ParsedInsight {
  const lines = markdown.trim().split("\n");
  let status: StatusLevel = "WARNING";
  let startIdx = 0;

  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const line = lines[i]?.trim();
    if (line?.startsWith("STATUS:")) {
      const val = line.replace("STATUS:", "").trim().toUpperCase();
      if (val === "HEALTHY") status = "HEALTHY";
      else if (val === "CRITICAL") status = "CRITICAL";
      else status = "WARNING";
      startIdx = i + 1;
      break;
    }
  }

  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("### ")) {
      if (current) sections.push({ ...current, content: current.content.trim() });
      current = { heading: line.slice(4).trim(), content: "" };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) sections.push({ ...current, content: current.content.trim() });

  return { status, sections };
}

// ─── AI confidence badge ──────────────────────────────────────────────────────

export function getConfidenceLevel(
  confidence: number | null | undefined,
  sectionCount: number,
): 1 | 2 | 3 {
  if (confidence != null) {
    return confidence >= 0.75 ? 3 : confidence >= 0.5 ? 2 : 1;
  }
  return sectionCount >= 5 ? 3 : sectionCount >= 3 ? 2 : 1;
}

function ConfidenceBadge({
  confidence,
  sectionCount,
}: {
  confidence?: number | null;
  sectionCount: number;
}) {
  const level = getConfidenceLevel(confidence, sectionCount);
  const textLabel = level === 3 ? "High" : level === 2 ? "Med" : "Low";
  const styles =
    level === 3
      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-400"
      : level === 2
        ? "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-800/40 dark:text-yellow-400"
        : "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-800/40 dark:text-red-400";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5", styles)}
      title={`AI confidence: ${textLabel.toLowerCase()}`}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide">{textLabel}</span>
      <span className="flex items-end gap-0.5">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn(
              "inline-block w-0.5 rounded-full",
              bar === 1 ? "h-2" : bar === 2 ? "h-3" : "h-4",
              bar <= level ? "bg-current" : "bg-current opacity-20",
            )}
          />
        ))}
      </span>
    </span>
  );
}

// ─── Semantic chip coloring ───────────────────────────────────────────────────

type ChipTone = "neutral" | "success" | "warning" | "danger";

function chipTone(label: string, value: string): ChipTone {
  const l = label.toLowerCase();
  const v = value.toLowerCase();

  if (/\b(overdue|blocked|idle|critical|stale|stuck|miss|late)\b/.test(v)) return "danger";
  if (/\b(warning|at.?risk|delayed|slow|behind)\b/.test(v)) return "warning";
  if (/\b(on.?track|healthy|done|resolved|complete|good)\b/.test(v)) return "success";

  if (/\b(overdue|blocker|idle|stuck|frozen)\b/.test(l)) {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    if (!isNaN(n)) return n === 0 ? "success" : n <= 1 ? "warning" : "danger";
  }
  if (/\b(completion|done|resolved|velocity)\b/.test(l)) {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    if (!isNaN(n)) return n >= 75 ? "success" : n >= 40 ? "warning" : "danger";
  }

  return "neutral";
}

const CHIP_CLASSES: Record<ChipTone, string> = {
  neutral: "border-border/60 bg-muted/50 text-muted-foreground",
  success: "border-green-200/70 bg-green-50/80 text-green-700 dark:border-green-800/40 dark:bg-green-950/20 dark:text-green-400",
  warning: "border-yellow-200/70 bg-yellow-50/80 text-yellow-700 dark:border-yellow-800/40 dark:bg-yellow-950/20 dark:text-yellow-400",
  danger:  "border-red-200/70 bg-red-50/80 text-red-600 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-400",
};

// ─── Metrics pills ────────────────────────────────────────────────────────────

function MetricsSection({ content }: { content: string }) {
  const lines = content
    .trim()
    .split("\n")
    .filter((l) => l.trim().startsWith("-"));

  if (lines.length === 0) {
    return <p className="text-xs text-muted-foreground/70 italic">{content.trim()}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {lines.map((line, i) => {
        const text = line.replace(/^-\s*/, "").trim();
        const colonIdx = text.indexOf(":");
        const label = colonIdx > -1 ? text.slice(0, colonIdx).trim() : text;
        const value = colonIdx > -1 ? text.slice(colonIdx + 1).trim() : "";
        const tone = chipTone(label, value);
        return (
          <span
            key={i}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px]",
              CHIP_CLASSES[tone],
            )}
          >
            <span className="font-medium">{label}</span>
            {value && (
              <>
                <span className="opacity-30">·</span>
                <span className="font-semibold">{value}</span>
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/55">
      {children}
    </span>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusAccentClass(status: StatusLevel): string {
  if (status === "HEALTHY") return "bg-green-500";
  if (status === "CRITICAL") return "bg-red-500";
  return "bg-yellow-400";
}

function statusBorderClass(status: StatusLevel): string {
  if (status === "CRITICAL") return "border-red-200 dark:border-red-900/40";
  if (status === "WARNING") return "border-yellow-200/60 dark:border-yellow-900/30";
  return "border-border";
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusLevel }) {
  if (status === "HEALTHY") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle2 className="size-2.5" />
        Healthy
      </span>
    );
  }
  if (status === "CRITICAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertCircle className="size-2.5" />
        Critical
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
      <AlertTriangle className="size-2.5" />
      Warning
    </span>
  );
}

// ─── Auto badge ───────────────────────────────────────────────────────────────

function AutoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      <Sparkles className="size-2.5" />
      Auto
    </span>
  );
}

// ─── Compact body — all 6 sections, separated by dividers ────────────────────

function CompactBody({ sections, status }: { sections: ParsedSection[]; status: StatusLevel }) {
  const happening  = sections.find((s) => s.heading === "What's happening");
  const metrics    = sections.find((s) => s.heading === "Detected Metrics");
  const rootCause  = sections.find((s) => ["Root Cause", "The problem"].includes(s.heading));
  const doFirst    = sections.find((s) => s.heading === "Do this first");
  const whatToDo   = sections.find((s) => s.heading === "What to do");
  const whyMatters = sections.find((s) => ["Why this matters", "Delay Impact"].includes(s.heading));
  const action     = doFirst ?? whatToDo;

  const actionBg =
    status === "CRITICAL"
      ? "bg-red-50/80 dark:bg-red-950/20"
      : status === "WARNING"
        ? "bg-amber-50/60 dark:bg-amber-950/15"
        : "bg-muted/40";

  const actionArrow =
    status === "CRITICAL"
      ? "text-red-600 dark:text-red-400"
      : status === "WARNING"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground/40";

  const actionText =
    status === "CRITICAL"
      ? "text-red-700 dark:text-red-300"
      : status === "WARNING"
        ? "text-amber-800 dark:text-amber-300"
        : "text-foreground/80";

  return (
    <div className="flex flex-col divide-y divide-border/40">
      {/* ── Immediate Focus ── */}
      {happening && (
        <div className="flex flex-col gap-1 pb-2.5 first:pt-0">
          <SectionLabel>Immediate Focus</SectionLabel>
          <p className="line-clamp-3 text-xs leading-relaxed text-foreground/75">
            {toPlain(happening.content)}
          </p>
        </div>
      )}

      {/* ── Risks — metric chips ── */}
      {metrics && (
        <div className="flex flex-col gap-1.5 py-2.5">
          <SectionLabel>Risks</SectionLabel>
          <MetricsSection content={metrics.content} />
        </div>
      )}

      {/* ── Root Cause ── */}
      {rootCause && (
        <div className="flex flex-col gap-1 py-2.5">
          <SectionLabel>Root Cause</SectionLabel>
          <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/60">
            {toPlain(rootCause.content)}
          </p>
        </div>
      )}

      {/* ── Recommended Action ── */}
      {action && (
        <div className="flex flex-col gap-1.5 py-2.5">
          <SectionLabel>Recommended Action</SectionLabel>
          <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2.5", actionBg)}>
            <ArrowRight className={cn("mt-0.5 size-3.5 shrink-0", actionArrow)} />
            <p className={cn("text-xs font-medium leading-relaxed", actionText)}>
              {toPlain(action.content)}
            </p>
          </div>
        </div>
      )}

      {/* ── Delay Impact ── */}
      {whyMatters && (
        <div className="flex flex-col gap-1 py-2.5 last:pb-0">
          <SectionLabel>Delay Impact</SectionLabel>
          <div className="flex items-start gap-1.5">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-400" />
            <p className="line-clamp-2 text-[11px] italic leading-relaxed text-amber-700/80 dark:text-amber-400/70">
              {toPlain(whyMatters.content)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Detail section (expanded "What to do" panel) ────────────────────────────

function DetailSection({ section }: { section: ParsedSection }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="border-l-2 border-primary/30 pl-2 text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
        {section.heading === "What to do" ? "Full Action Plan" : section.heading}
      </p>
      <div className="text-xs leading-relaxed text-foreground/80">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
            ul: ({ children }) => (
              <ul className="mt-1 flex flex-col gap-1 pl-0">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mt-1 flex flex-col gap-1.5 pl-4 list-decimal">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-xs leading-relaxed text-foreground/80 pl-0.5">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
          }}
        >
          {section.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// ─── Animated loading text ────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  "Reading task data…",
  "Scanning for patterns…",
  "Identifying blockers…",
  "Calculating risk level…",
  "Building recommendations…",
  "Finalizing analysis…",
];

function AnimatedLoadingMessage() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-xs font-medium text-muted-foreground/80 transition-all duration-500">
      {LOADING_MESSAGES[idx]}
    </span>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block size-1.5 animate-bounce rounded-full bg-primary/60"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Live streaming view ──────────────────────────────────────────────────────

function StreamingView({ content }: { content: string }) {
  const partial = parseInsight(content);
  const hasStatusLine = content.includes("STATUS:");
  const hasSections = partial.sections.length > 0;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <LoadingDots />
        <AnimatedLoadingMessage />
        {hasStatusLine && hasSections && <StatusBadge status={partial.status} />}
      </div>
      {hasSections ? (
        <CompactBody sections={partial.sections} status={partial.status} />
      ) : (
        <StreamingSkeleton showLoader={false} />
      )}
    </div>
  );
}

// ─── Realistic loading skeleton ───────────────────────────────────────────────

function StreamingSkeleton({ showLoader = true }: { showLoader?: boolean }) {
  return (
    <div className="flex flex-col gap-0">
      {showLoader && (
        <div className="flex items-center gap-2 pb-3">
          <LoadingDots />
          <AnimatedLoadingMessage />
        </div>
      )}
      <div className="flex flex-col divide-y divide-border/40">
        {/* Immediate Focus skeleton */}
        <div className="flex flex-col gap-1.5 pb-2.5">
          <div className="h-2 w-20 animate-pulse rounded bg-muted/80" />
          <div className="space-y-1">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
        {/* Risks skeleton */}
        <div className="flex flex-col gap-1.5 py-2.5">
          <div className="h-2 w-8 animate-pulse rounded bg-muted/80" />
          <div className="flex flex-wrap gap-1">
            <div className="h-5 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-14 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
        {/* Action skeleton */}
        <div className="flex flex-col gap-1.5 py-2.5 last:pb-0">
          <div className="h-2 w-28 animate-pulse rounded bg-muted/80" />
          <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface InsightCardProps {
  config: InsightConfig;
  savedInsight: InsightDTO | null;
  projectId: string;
  /** When true and no saved insight exists, automatically triggers generation once on mount */
  autoGenerate?: boolean;
}

export function InsightCard({ config, savedInsight, projectId, autoGenerate }: InsightCardProps) {
  const queryClient = useQueryClient();
  const { dismiss, undismiss } = useDismissInsight(projectId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const autoTriggeredRef = useRef(false);

  const Icon = config.icon;
  const parsed = savedInsight ? parseInsight(savedInsight.content) : null;
  const isDismissed = !!savedInsight?.dismissedAt;
  const insightIsFresh = savedInsight ? isFresh(savedInsight.updatedAt) : false;
  const placeholder = PLACEHOLDER_COPY[config.type];

  const handleGenerate = useCallback(
    async (force = false) => {
      if (isGenerating) return;
      setIsGenerating(true);
      setError(null);
      setStreamContent("");
      setIsFromCache(false);

      try {
        let accum = "";
        for await (const event of insightApi.generateInsight(projectId, config.type, force)) {
          if (event.type === "chunk") {
            accum += event.content;
            setStreamContent(accum);
          } else if (event.type === "done") {
            setIsExpanded(false);
            if (event.fromCache) setIsFromCache(true);
            setStreamContent("");
            await queryClient.invalidateQueries({
              queryKey: queryKeys.insight.byProject(projectId),
            });
          } else if (event.type === "error") {
            const msg = event.message ?? "Generation failed";
            setError(msg);
            toast.error(msg);
          }
        }
      } catch {
        const msg = "Connection lost — please try again";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsGenerating(false);
      }
    },
    [config.type, isGenerating, projectId, queryClient],
  );

  const handleDismiss = useCallback(() => {
    if (!savedInsight) return;
    if (isDismissed) {
      undismiss.mutate(config.type, { onError: () => toast.error("Could not restore insight") });
    } else {
      dismiss.mutate(config.type, { onError: () => toast.error("Could not dismiss insight") });
    }
  }, [config.type, dismiss, isDismissed, savedInsight, undismiss]);

  // Auto-trigger generation once when risk is elevated and no insight is cached
  useEffect(() => {
    if (autoGenerate && !savedInsight && !isGenerating && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      void handleGenerate(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, savedInsight]);

  // Only show "What to do" in the expanded panel — all other sections are in CompactBody.
  const detailSections =
    parsed?.sections.filter((s) => s.heading === "What to do") ?? [];

  return (
    <div
      className={cn(
        "group flex flex-col rounded-xl border bg-card transition-all duration-200",
        "hover:shadow-sm",
        isDismissed && "opacity-60",
        parsed ? statusBorderClass(parsed.status) : "border-border",
        isGenerating && "ring-1 ring-primary/20",
      )}
    >
      {/* ── Status accent bar (thicker for emphasis) ── */}
      {parsed && !isDismissed && (
        <div className={cn("h-1 w-full rounded-t-xl", statusAccentClass(parsed.status))} />
      )}

      {/* ── Header ── */}
      <div className="flex items-start gap-3 p-3 pb-2.5">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            config.iconBgClass,
          )}
        >
          <Icon className={cn("size-4", config.accentClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold leading-tight">{config.title}</h3>
            {parsed && !isGenerating && !isDismissed && <StatusBadge status={parsed.status} />}
            {parsed && !isGenerating && !isDismissed && (
              <ConfidenceBadge
                confidence={savedInsight?.confidence}
                sectionCount={parsed.sections.length}
              />
            )}
            {savedInsight?.autoGenerated && !isGenerating && <AutoBadge />}
            {isDismissed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <EyeOff className="size-2.5" />
                Dismissed
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {config.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {savedInsight && !isGenerating && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={dismiss.isPending || undismiss.isPending}
              className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={isDismissed ? "Restore insight" : "Dismiss insight"}
              title={isDismissed ? "Restore" : "Dismiss"}
            >
              {isDismissed ? <RotateCcw className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
            className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100"
            aria-label={savedInsight ? "Force refresh insight" : "Generate insight"}
            title={isGenerating ? "Generating…" : savedInsight ? "Refresh analysis" : "Generate"}
          >
            <RefreshCw className={cn("size-3.5", isGenerating && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-3 h-px bg-border/50" />

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col p-3 pt-2.5">
        {/* Error */}
        {error && !isGenerating && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Contextual empty state */}
        {!savedInsight && !isGenerating && !error && (
          <button
            type="button"
            onClick={() => handleGenerate(false)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg py-5 text-center",
              "border border-dashed border-border/70 transition-colors",
              "hover:border-primary/30 hover:bg-muted/20",
            )}
          >
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-full",
                config.iconBgClass,
              )}
            >
              <Sparkles className={cn("size-4", config.accentClass)} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground/80">
                {placeholder?.headline ?? "Run AI analysis"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {placeholder?.sub ?? "Takes about 5 seconds"}
              </p>
            </div>
          </button>
        )}

        {/* Live streaming view */}
        {isGenerating && streamContent && <StreamingView content={streamContent} />}

        {/* Initial skeleton */}
        {isGenerating && !streamContent && <StreamingSkeleton />}

        {/* Compact view — all sections visible by default */}
        {parsed && !isGenerating && parsed.sections.length >= 1 && (
          <>
            <CompactBody sections={parsed.sections} status={parsed.status} />

            {/* Expandable "What to do" full list */}
            {detailSections.length > 0 && (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => setIsExpanded((v) => !v)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
                >
                  {isExpanded ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                  {isExpanded ? "Hide action plan" : "See full action plan"}
                </button>

                {isExpanded && (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border/40 bg-muted/20 p-3">
                    {detailSections.map((section) => (
                      <DetailSection key={section.heading} section={section} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Fallback: raw markdown if parsing yields no sections */}
        {savedInsight && !isGenerating && parsed && parsed.sections.length === 0 && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs [&_li]:text-xs [&_p]:my-1 [&_p]:leading-relaxed">
            <ReactMarkdown>{savedInsight.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {savedInsight && !isGenerating && (
        <div className="flex items-center gap-2 border-t border-border/40 px-3 py-1.5 text-[10px] text-muted-foreground/50">
          <Clock className="size-3 shrink-0" />
          <span>{formatRelativeTime(savedInsight.updatedAt)}</span>

          {isFromCache && (
            <span
              className="flex items-center gap-0.5 text-blue-500/70"
              title="Served from cache — no AI call was made"
            >
              <Database className="size-2.5" />
              cached
            </span>
          )}
          {insightIsFresh && !isFromCache && (
            <span
              className="flex items-center gap-0.5 text-emerald-500/60"
              title="Generated within the last 30 minutes"
            >
              <Zap className="size-2.5" />
              fresh
            </span>
          )}
        </div>
      )}
    </div>
  );
}
