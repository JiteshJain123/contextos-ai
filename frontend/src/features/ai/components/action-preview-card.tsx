"use client";

import {
  AlertCircle,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  GitBranch,
  HelpCircle,
  ListPlus,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  UserRoundCheck,
  Wand2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type {
  ActionPayload,
  AssignTaskAction,
  CreateSubtasksAction,
  CreateTaskAction,
  GenerateSprintTasksAction,
  ReprioritizeTasksAction,
  UpdateTaskStatusAction,
} from "@/lib/validators/ai-actions";
import type { TaskPriority, TaskStatus } from "@/lib/validators/task";

import { useExecuteAction } from "../hooks/use-execute-action";

// ── Confidence ─────────────────────────────────────────────────────────────────

type Confidence = "high" | "medium" | "low";

// Higher confidence = AI matched specific named entities that must exist.
// Lower confidence = AI is generating new content with no existing reference.
const CONFIDENCE_BY_TYPE: Record<ActionPayload["type"], Confidence> = {
  update_task_status: "high",
  assign_task: "high",
  create_task: "medium",
  create_subtasks: "medium",
  reprioritize_tasks: "medium",
  generate_sprint_tasks: "low",
};

const CONFIDENCE_META: Record<
  Confidence,
  { label: string; icon: React.ReactNode; className: string }
> = {
  high: {
    label: "High confidence",
    icon: <CheckCircle2 className="size-3" aria-hidden="true" />,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  medium: {
    label: "Medium confidence",
    icon: <AlertCircle className="size-3" aria-hidden="true" />,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  },
  low: {
    label: "Low confidence",
    icon: <HelpCircle className="size-3" aria-hidden="true" />,
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-400",
  },
};

// ── Action type meta ───────────────────────────────────────────────────────────

type ActionMeta = {
  label: string;
  sectionLabel: string;
  icon: React.ReactNode;
  chipClass: string;
  accentBorder: string;
};

const ACTION_META: Record<ActionPayload["type"], ActionMeta> = {
  create_task: {
    label: "Create Task",
    sectionLabel: "New task",
    icon: <ListPlus className="size-3.5" aria-hidden="true" />,
    chipClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
    accentBorder: "border-l-emerald-500",
  },
  update_task_status: {
    label: "Update Status",
    sectionLabel: "Status change",
    icon: <ArrowRight className="size-3.5" aria-hidden="true" />,
    chipClass:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
    accentBorder: "border-l-blue-500",
  },
  create_subtasks: {
    label: "Create Subtasks",
    sectionLabel: "Subtasks to add",
    icon: <GitBranch className="size-3.5" aria-hidden="true" />,
    chipClass:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400",
    accentBorder: "border-l-violet-500",
  },
  reprioritize_tasks: {
    label: "Reprioritize",
    sectionLabel: "Priority changes",
    icon: <SlidersHorizontal className="size-3.5" aria-hidden="true" />,
    chipClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
    accentBorder: "border-l-amber-500",
  },
  assign_task: {
    label: "Assign Task",
    sectionLabel: "Assignment",
    icon: <UserRoundCheck className="size-3.5" aria-hidden="true" />,
    chipClass:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
    accentBorder: "border-l-sky-500",
  },
  generate_sprint_tasks: {
    label: "Generate Tasks",
    sectionLabel: "Sprint goal",
    icon: <Wand2 className="size-3.5" aria-hidden="true" />,
    chipClass:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-400",
    accentBorder: "border-l-orange-500",
  },
};

// ── Status pill ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "In Review",
  DONE: "Done",
};

const STATUS_CLASS: Record<TaskStatus, string> = {
  TODO: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  DONE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

function StatusPill({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
        STATUS_CLASS[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── Priority pill (thin wrapper — keeps AI feature self-contained) ─────────────

const PRIORITY_VARIANT = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const satisfies Record<TaskPriority, "low" | "medium" | "high" | "urgent">;

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

function PriorityPill({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]} className="text-[10px]">
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

// ── Action-specific detail renderers ──────────────────────────────────────────

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 dark:bg-muted/20">
      {children}
    </div>
  );
}

function CreateTaskDetails({ action }: { action: CreateTaskAction }) {
  return (
    <DetailShell>
      <p className="truncate text-sm font-medium text-foreground" title={action.title}>
        {action.title}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityPill priority={action.priority} />
        <StatusPill status={action.status} />
        {action.dueDate && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <CalendarDays className="size-3" aria-hidden="true" />
            {action.dueDate}
          </span>
        )}
      </div>
      {action.description && (
        <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          {action.description}
        </p>
      )}
    </DetailShell>
  );
}

function UpdateStatusDetails({ action }: { action: UpdateTaskStatusAction }) {
  return (
    <DetailShell>
      <p className="truncate text-sm font-medium text-foreground" title={action.taskTitle}>
        {action.taskTitle}
      </p>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
        <span>Move to</span>
        <StatusPill status={action.newStatus} />
      </div>
    </DetailShell>
  );
}

const SUBTASK_PREVIEW_LIMIT = 5;

function CreateSubtasksDetails({ action }: { action: CreateSubtasksAction }) {
  const visible = action.subtasks.slice(0, SUBTASK_PREVIEW_LIMIT);
  const hidden = action.subtasks.length - visible.length;

  return (
    <DetailShell>
      <p className="text-[11px] text-muted-foreground">
        Parent:{" "}
        <span className="font-medium text-foreground">{action.parentTaskTitle}</span>
      </p>
      <div className="space-y-1 pt-0.5">
        {visible.map((st, i) => (
          <div key={i} className="flex items-center gap-2">
            <ChevronDown className="size-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />
            <span
              className="min-w-0 flex-1 truncate text-[11px] text-foreground"
              title={st.title}
            >
              {st.title}
            </span>
            <PriorityPill priority={st.priority} />
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <p className="text-[10px] text-muted-foreground">+{hidden} more</p>
      )}
    </DetailShell>
  );
}

const REPRIORITIZE_PREVIEW_LIMIT = 5;

function ReprioritizeDetails({ action }: { action: ReprioritizeTasksAction }) {
  const visible = action.changes.slice(0, REPRIORITIZE_PREVIEW_LIMIT);
  const hidden = action.changes.length - visible.length;

  return (
    <DetailShell>
      <div className="space-y-1">
        {visible.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="min-w-0 flex-1 truncate text-[11px] text-foreground"
              title={c.taskTitle}
            >
              {c.taskTitle}
            </span>
            <ArrowRight className="size-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />
            <PriorityPill priority={c.newPriority} />
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <p className="text-[10px] text-muted-foreground">+{hidden} more</p>
      )}
    </DetailShell>
  );
}

function AssignTaskDetails({ action }: { action: AssignTaskAction }) {
  const displayName = action.assigneeName ?? action.assigneeEmail ?? "Team member";
  const showEmail = action.assigneeName && action.assigneeEmail;

  return (
    <DetailShell>
      <p className="truncate text-sm font-medium text-foreground" title={action.taskTitle}>
        {action.taskTitle}
      </p>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
        <span>Assign to</span>
        <span className="font-medium text-foreground">{displayName}</span>
        {showEmail && (
          <span className="truncate text-muted-foreground">({action.assigneeEmail})</span>
        )}
      </div>
    </DetailShell>
  );
}

function GenerateSprintDetails({ action }: { action: GenerateSprintTasksAction }) {
  return (
    <DetailShell>
      <p className="line-clamp-3 text-[11px] leading-relaxed text-foreground">
        {action.goal}
      </p>
      <p className="text-[10px] text-muted-foreground">
        AI will generate{" "}
        <span className="font-semibold text-foreground">{action.taskCount}</span> tasks
      </p>
    </DetailShell>
  );
}

function ActionDetails({ payload }: { payload: ActionPayload }) {
  switch (payload.type) {
    case "create_task":
      return <CreateTaskDetails action={payload} />;
    case "update_task_status":
      return <UpdateStatusDetails action={payload} />;
    case "create_subtasks":
      return <CreateSubtasksDetails action={payload} />;
    case "reprioritize_tasks":
      return <ReprioritizeDetails action={payload} />;
    case "assign_task":
      return <AssignTaskDetails action={payload} />;
    case "generate_sprint_tasks":
      return <GenerateSprintDetails action={payload} />;
  }
}

// ── Confidence badge ───────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const { label, icon, className } = CONFIDENCE_META[confidence];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        className,
      )}
      title={label}
      aria-label={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface ActionPreviewCardProps {
  projectId: string;
  conversationId: string;
  payload: ActionPayload;
  description: string;
  onDismiss: () => void;
}

/**
 * Shown above the chat input when the AI detects an actionable request.
 * The user must explicitly confirm — nothing runs automatically.
 *
 * States:
 *   idle     — Cancel + Confirm buttons
 *   pending  — Confirm becomes a spinner, Cancel is disabled
 *   error    — inline error row + Retry button; Cancel re-enabled
 *   success  — hook calls onDismiss, card disappears
 */
export function ActionPreviewCard({
  projectId,
  conversationId,
  payload,
  description,
  onDismiss,
}: ActionPreviewCardProps) {
  const meta = ACTION_META[payload.type];
  const confidence = CONFIDENCE_BY_TYPE[payload.type];
  const mutation = useExecuteAction(projectId, conversationId, onDismiss);

  return (
    <Card
      className={cn(
        "mb-2 border-l-2 shadow-sm",
        "animate-in slide-in-from-bottom-2 fade-in duration-200",
        meta.accentBorder,
      )}
    >
      {/* ── Header ── */}
      <CardHeader className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          {/* Left: bot icon + title */}
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <Bot className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-none text-foreground">
                AI Suggestion
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Review before applying to your project
              </p>
            </div>
          </div>
          {/* Right: confidence + close */}
          <div className="flex shrink-0 items-center gap-1.5">
            <ConfidenceBadge confidence={confidence} />
            <button
              type="button"
              onClick={onDismiss}
              disabled={mutation.isPending}
              aria-label="Dismiss"
              className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>

      {/* ── Body ── */}
      <CardContent className="px-4 pb-3 pt-0">
        {/* Action type chip + one-line summary */}
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              meta.chipClass,
            )}
          >
            {meta.icon}
            {meta.label}
          </span>
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            {description}
          </p>
        </div>

        {/* Section label */}
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
          {meta.sectionLabel}
        </p>

        {/* Affected tasks / preview changes */}
        <ActionDetails payload={payload} />
      </CardContent>

      {/* ── Footer ── */}
      <CardFooter className="flex-col items-stretch gap-2 px-4 pb-3 pt-0">
        {/* Inline error row */}
        {mutation.isError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
            <AlertCircle className="mt-px size-3.5 shrink-0 text-destructive" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[11px] text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Action failed — please try again"}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2">
          <p className="hidden text-[10px] text-muted-foreground/50 sm:block">
            This will modify your project
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-xs text-muted-foreground"
              onClick={onDismiss}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 min-w-[80px] gap-1.5 px-3 text-xs"
              onClick={() => mutation.mutate(payload)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Applying…
                </>
              ) : mutation.isError ? (
                <>
                  <RefreshCw className="size-3" />
                  Retry
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
