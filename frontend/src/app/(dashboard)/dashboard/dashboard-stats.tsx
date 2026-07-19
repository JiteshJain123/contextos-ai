"use client";

import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  FolderKanban,
  LayoutList,
  ListChecks,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { useDashboardStats, type RecentTask } from "@/features/project/hooks/use-dashboard-stats";
import {
  deriveInsights,
  SEVERITY_ICON,
  type AiInsight,
} from "@/features/project/lib/derive-insights";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  isLoading,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  isLoading: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card p-4",
        href && "transition-colors hover:bg-muted/40",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      {isLoading ? (
        <div className="h-7 w-12 animate-pulse rounded bg-muted" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
      {sub && !isLoading && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );

  return href ? <Link href={href as never}>{inner}</Link> : inner;
}

// ── Composed dashboard ────────────────────────────────────────────────────────

export function DashboardStats() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboardStats();

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="size-4 shrink-0" />
        Failed to load analytics. Refresh to retry.
      </div>
    );
  }

  const stats = data ?? {
    projectCount: 0,
    tasksByStatus: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
    tasksByPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
    overdueCount: 0,
    avgHealthScore: 0,
    overdueMilestoneCount: 0,
    completionTrend: [],
    recentTasks: [] as RecentTask[],
  };

  const totalTasks = Object.values(stats.tasksByStatus).reduce((a, b) => a + b, 0);
  const completionPct =
    totalTasks > 0 ? Math.round((stats.tasksByStatus.DONE / totalTasks) * 100) : 0;

  // First run: no projects yet — show a guided onboarding card instead of
  // empty stat cards.
  if (!isLoading && data && stats.projectCount === 0) {
    return <GettingStartedCard />;
  }

  const insights = deriveInsights({
    tasksByStatus: stats.tasksByStatus,
    overdueCount: stats.overdueCount,
    avgHealthScore: stats.avgHealthScore,
    overdueMilestoneCount: stats.overdueMilestoneCount,
    totalTasks,
    completionPct,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Overview</h2>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Refresh stats"
          >
            <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Projects"
            value={stats.projectCount}
            icon={FolderKanban}
            isLoading={isLoading}
            href="/projects"
          />
          <StatCard
            label="Total tasks"
            value={totalTasks}
            icon={LayoutList}
            isLoading={isLoading}
          />
          <StatCard
            label="Completed"
            value={stats.tasksByStatus.DONE}
            sub={totalTasks > 0 ? `${completionPct}% of all tasks` : undefined}
            icon={CheckCircle2}
            isLoading={isLoading}
          />
          <StatCard
            label="Overdue"
            value={stats.overdueCount}
            icon={stats.overdueCount > 0 ? AlertCircle : CheckCircle2}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Insights + Recent work */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InsightsList insights={insights} isLoading={isLoading} />
        <RecentWorkList tasks={stats.recentTasks ?? []} isLoading={isLoading} />
      </div>
    </div>
  );
}

// ── First-run onboarding ──────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    icon: FolderKanban,
    title: "Create your first project",
    description: "Give it a name and a goal — everything else hangs off a project.",
  },
  {
    icon: ListChecks,
    title: "Add tasks or upload a document",
    description:
      "Create tasks on the Kanban board, or upload a spec/brief and let AI extract them.",
  },
  {
    icon: Bot,
    title: "Let AI plan it",
    description:
      "Use the AI Planner to generate a roadmap, or AI Breakdown to split a goal into tasks.",
  },
  {
    icon: CheckCircle2,
    title: "Track and ship",
    description:
      "Work the board, watch the calendar and timeline, and check Insights for risks.",
  },
] as const;

function GettingStartedCard() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold tracking-tight">Welcome to ContextOS AI</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Four steps to your first AI-planned project.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <ol className="divide-y divide-border">
          {ONBOARDING_STEPS.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="flex items-start gap-4 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4 text-primary" aria-hidden="true" />
                  {title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Create your first project
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <FileText className="size-4" aria-hidden="true" />
          Read the guide
        </Link>
      </div>
    </div>
  );
}

// ── Insights list ─────────────────────────────────────────────────────────────

function InsightsList({ insights, isLoading }: { insights: AiInsight[]; isLoading: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Insights</h2>
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-4">
                <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <div key={insight.id} className="flex items-start gap-3 p-4">
                  <Icon
                    className={cn("mt-0.5 size-4 shrink-0", SEVERITY_ICON[insight.severity])}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{insight.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <Link
                        href={insight.action.href as never}
                        className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                      >
                        {insight.action.label}
                        <ChevronRight className="size-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Recent work list ──────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-muted-foreground/40",
  IN_PROGRESS: "bg-blue-500",
  REVIEW: "bg-violet-500",
  DONE: "bg-emerald-500",
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "In Review",
  DONE: "Done",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function RecentWorkList({ tasks, isLoading }: { tasks: RecentTask[]; isLoading: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Recent work</h2>
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="size-2 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Circle className="size-3.5" />
            No tasks yet — create a project to get started
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/projects/${task.projectSlug}` as never}
                className="group flex items-center gap-3 p-3 transition-colors hover:bg-muted/40"
              >
                <span
                  className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[task.status] ?? "bg-muted")}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {task.projectName} · {STATUS_LABEL[task.status] ?? task.status}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {timeAgo(task.updatedAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
