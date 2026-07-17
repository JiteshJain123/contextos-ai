import type { InsightType } from "@/validators/insight";

type TaskRow = {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignees: string[];
};

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

/** Rich task line with overdue days, idle days, and description snippet. */
function taskLine(t: TaskRow, now: Date): string {
  const dueDate = t.dueDate ? new Date(t.dueDate) : null;
  const due = dueDate ? ` due:${fmt(dueDate)}` : "";

  const daysOverdue = dueDate && dueDate < now
    ? Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000)
    : 0;
  const overdueTag = daysOverdue > 0 ? ` [OVERDUE ${daysOverdue}d]` : "";

  const daysIdle = Math.floor((now.getTime() - t.updatedAt.getTime()) / 86_400_000);
  const idleTag = daysIdle >= 2 ? ` [idle ${daysIdle}d]` : "";

  const snippet = t.description
    ? ` — ${t.description.slice(0, 90)}${t.description.length > 90 ? "…" : ""}`
    : "";

  return `- [${t.priority}] "${t.title}"${due}${overdueTag}${idleTag}${snippet}`;
}

// ─── Shared output format ─────────────────────────────────────────────────────
//
// Sections "What's happening" and "Do this first" drive CompactBody in the UI.
// "Detected Metrics", "Root Cause", "What to do", "Why this matters" appear in
// the expandable detail panel.

const FORMAT = `
Respond in EXACTLY this markdown structure. No extra text before or after.

STATUS: [HEALTHY or WARNING or CRITICAL]

### What's happening
[2–3 sentences. Use the exact task titles, counts, and dates from the data above.
 Describe what is actually happening in this specific project right now.]

### Detected Metrics
- [metric label]: [exact value with unit/context]
- [metric label]: [exact value]
- [metric label]: [exact value]
- [metric label]: [exact value]
(4–6 lines. Real numbers only. No placeholders.)

### Root Cause
[1–2 sentences. Name the specific bottleneck, stall pattern, or gap. Not a category — the actual thing.
 Example: "3 URGENT tasks have been idle for 5+ days because they all require a code review that hasn't happened."]

### What to do
1. [Concrete action — cite the exact task title if one applies. No vague verbs like "improve" or "review".]
2. [Concrete action — same rule]
3. [Concrete action — omit if only 2 clear actions exist]

### Do this first
**[Single highest-impact action. Name the exact task, person, or step. Be blunt.]**

### Why this matters
[1 sentence. Concrete consequence if this is ignored for one more week.]

QUALITY RULES (strictly enforced):
- Never write "improve productivity", "consider reviewing", "focus on priorities", "it is recommended", "optimize workflow"
- Every task mentioned must be from the data above — no invented task names
- Every metric must be a real number derived from the data
- If you cannot find specific data, say "no data" — do not invent values
- STATUS must reflect the actual numbers: not CRITICAL just to seem urgent
`.trim();

// ─── Metrics helpers ──────────────────────────────────────────────────────────

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function pluralDays(n: number): string {
  return `${n} day${n === 1 ? "" : "s"}`;
}

/** Task line with assignee list appended. */
function richTaskLine(t: TaskRow, now: Date): string {
  const base = taskLine(t, now);
  const names = t.assignees.length > 0 ? t.assignees.join(", ") : "unassigned";
  return `${base} [${names}]`;
}

/**
 * Numbered task line for dependency/critical-path analysis.
 * Exposes creation date, assignees, and a full description to give the AI
 * enough signal to infer logical task ordering and relationships.
 */
function depTaskLine(t: TaskRow, idx: number, now: Date): string {
  const dueDate = t.dueDate ? new Date(t.dueDate) : null;
  const due = dueDate ? ` due:${fmt(dueDate)}` : "";
  const daysOverdue = dueDate && dueDate < now
    ? Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000)
    : 0;
  const overdueTag = daysOverdue > 0 ? ` [OVERDUE ${daysOverdue}d]` : "";
  const idleDays = Math.floor((now.getTime() - t.updatedAt.getTime()) / 86_400_000);
  const idleTag = idleDays >= 2 ? ` [idle ${idleDays}d]` : "";
  const names = t.assignees.length > 0 ? ` [@${t.assignees.join(", @")}]` : " [unassigned]";
  const desc = t.description ? `\n     Desc: "${t.description.slice(0, 160)}${t.description.length > 160 ? "…" : ""}"` : "";
  return `[T${idx + 1}] [${t.priority}] "${t.title}" | ${t.status}${due}${overdueTag}${idleTag}${names} | created:${fmt(t.createdAt)}${desc}`;
}

/**
 * Per-task stall block — one structured block per idle task so the AI
 * can generate a specific diagnosis and action for each one.
 */
function stallBlock(t: TaskRow, now: Date): string {
  const idleDays = Math.floor((now.getTime() - t.updatedAt.getTime()) / 86_400_000);
  const dueDate = t.dueDate ? new Date(t.dueDate) : null;
  const daysOverdue = dueDate && dueDate < now
    ? Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000)
    : 0;
  const dueStr = dueDate
    ? ` | due:${fmt(dueDate)}${daysOverdue > 0 ? ` (${daysOverdue}d OVERDUE)` : ""}`
    : " | no due date";
  const names = t.assignees.length > 0 ? t.assignees.join(", ") : "unassigned";
  const desc = t.description ? `\n  Desc: "${t.description.slice(0, 180)}${t.description.length > 180 ? "…" : ""}"` : "";
  return `• "${t.title}"\n  Status:${t.status} | Priority:${t.priority} | Idle:${idleDays}d${dueStr} | Assigned:${names}${desc}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildInsightPrompt(
  type: InsightType,
  projectName: string,
  projectDescription: string | null,
  tasks: TaskRow[],
): { systemPrompt: string; userMessage: string } {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000);
  const dayAgo = new Date(now.getTime() - 86_400_000);

  // ── Slices ────────────────────────────────────────────────────────────────
  const activeTasks = tasks.filter((t) => t.status !== "DONE");
  const doneTasks = tasks.filter((t) => t.status === "DONE");
  const overdueTasks = activeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const reviewTasks = tasks.filter((t) => t.status === "REVIEW");
  const todoTasks = tasks.filter((t) => t.status === "TODO");
  const completedThisWeek = doneTasks.filter((t) => t.updatedAt > weekAgo);
  const completedLastWeek = doneTasks.filter((t) => t.updatedAt > twoWeeksAgo && t.updatedAt <= weekAgo);
  const completedToday = doneTasks.filter((t) => t.updatedAt > dayAgo);
  const activeToday = activeTasks.filter((t) => t.updatedAt > dayAgo);

  const stalledInProgress = inProgressTasks.filter(
    (t) => (now.getTime() - t.updatedAt.getTime()) / 86_400_000 > 2,
  );
  const longInReview = reviewTasks.filter(
    (t) => (now.getTime() - t.updatedAt.getTime()) / 86_400_000 > 2,
  );

  const urgentTasks = activeTasks.filter((t) => t.priority === "URGENT");
  const highTasks = activeTasks.filter((t) => t.priority === "HIGH");
  const urgentOverdue = overdueTasks.filter((t) => t.priority === "URGENT");
  const highOverdue = overdueTasks.filter((t) => t.priority === "HIGH");

  const completionRate = pct(doneTasks.length, tasks.length);
  const overdueRate = pct(overdueTasks.length, activeTasks.length);
  const velocityTrend = completedLastWeek.length > 0
    ? `${completedThisWeek.length > completedLastWeek.length ? "+" : ""}${Math.round(((completedThisWeek.length - completedLastWeek.length) / completedLastWeek.length) * 100)}%`
    : "N/A (no baseline)";

  // ── Project context header ────────────────────────────────────────────────
  const header = `Project: "${projectName}"${projectDescription ? `\nDescription: ${projectDescription}` : ""}
Date: ${fmt(now)}
Total tasks: ${tasks.length} | Done: ${doneTasks.length} (${completionRate}) | In progress: ${inProgressTasks.length} | Review: ${reviewTasks.length} | Todo: ${todoTasks.length}
Active tasks: ${activeTasks.length} | Overdue: ${overdueTasks.length} (${overdueRate} of active) | URGENT: ${urgentTasks.length} | HIGH: ${highTasks.length}`;

  switch (type) {

    // ─── NEXT_TASK ────────────────────────────────────────────────────────────
    case "NEXT_TASK": {
      const prioOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const ranked = [...activeTasks]
        .sort((a, b) => {
          const d = (prioOrder[a.priority] ?? 2) - (prioOrder[b.priority] ?? 2);
          if (d !== 0) return d;
          if (a.dueDate && b.dueDate) return +new Date(a.dueDate) - +new Date(b.dueDate);
          return a.dueDate ? -1 : b.dueDate ? 1 : 0;
        })
        .slice(0, 8);

      const stalled = stalledInProgress.length;

      return {
        systemPrompt: `You are a project coach selecting the single best next task for a developer.
STATUS: HEALTHY if work is moving, WARNING if stalled or unclear priority, CRITICAL if urgent items are blocked.
For "Root Cause" — explain specifically why the top-ranked task beats the others (priority, due date, dependencies).
For "Do this first" — use the exact task title from the data.
${FORMAT}`,
        userMessage: `${header}
Stalled in-progress (idle 2+ days): ${stalled}
Completed this week: ${completedThisWeek.length}

Top candidates (ranked by priority then due date):
${ranked.map((t) => taskLine(t, now)).join("\n") || "No active tasks."}`,
      };
    }

    // ─── OVERDUE_TASKS ────────────────────────────────────────────────────────
    case "OVERDUE_TASKS": {
      const oldest = overdueTasks.reduce<TaskRow | null>((oldest, t) => {
        if (!t.dueDate) return oldest;
        if (!oldest || new Date(t.dueDate) < new Date(oldest.dueDate!)) return t;
        return oldest;
      }, null);
      const oldestDays = oldest?.dueDate
        ? Math.floor((now.getTime() - new Date(oldest.dueDate).getTime()) / 86_400_000)
        : 0;

      return {
        systemPrompt: `You are a project recovery coach helping a team recover from overdue tasks.
STATUS: HEALTHY = 0 overdue | WARNING = 1–2 overdue | CRITICAL = 3+ overdue OR any URGENT overdue.
For "Detected Metrics" include exact overdue count, priority breakdown, oldest overdue task name and days.
For "What to do" — give one action per overdue task (name the task). If 4+ overdue, focus on the top 3 by priority.
For "Do this first" — name the highest-priority overdue task explicitly.
${FORMAT}`,
        userMessage: `${header}

Overdue tasks (${overdueTasks.length} total, URGENT: ${urgentOverdue.length}, HIGH: ${highOverdue.length}):
${overdueTasks.map((t) => taskLine(t, now)).join("\n") || "None"}

Oldest overdue: ${oldest ? `"${oldest.title}" — ${pluralDays(oldestDays)} overdue` : "N/A"}`,
      };
    }

    // ─── DAILY_SUMMARY ────────────────────────────────────────────────────────
    case "DAILY_SUMMARY": {
      const activeTodayCount = activeToday.filter((t) => t.status !== "TODO").length;
      return {
        systemPrompt: `You are a project coach writing a daily status check-in.
STATUS: HEALTHY = tasks completed or moving today | WARNING = nothing done today | CRITICAL = nothing done today + overdue items.
For "What's happening" — describe today's specific progress (use exact task titles from done-today list).
For "Do this first" — name the most important remaining task for today.
${FORMAT}`,
        userMessage: `${header}
Completed today: ${completedToday.length}
Active (updated today, not TODO): ${activeTodayCount}

Done today:
${completedToday.map((t) => taskLine(t, now)).join("\n") || "(none)"}

Active/moving today:
${activeToday.filter((t) => t.status !== "TODO").map((t) => taskLine(t, now)).join("\n") || "(none)"}

Still in progress (not updated today):
${inProgressTasks.filter((t) => t.updatedAt <= dayAgo).map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── WORKLOAD_PRIORITY ────────────────────────────────────────────────────
    case "WORKLOAD_PRIORITY": {
      const urgentPlusHigh = urgentTasks.length + highTasks.length;
      const overloadRatio = activeTasks.length > 0
        ? Math.round((urgentPlusHigh / activeTasks.length) * 100)
        : 0;

      return {
        systemPrompt: `You are a project coach creating a priority order for the team.
STATUS: HEALTHY = clear priorities | WARNING = too many high-priority items | CRITICAL = urgent pile-up or overload.
For "Detected Metrics" include priority breakdown, overload ratio, stalled count.
For "What to do" — give a numbered top-3 order with exact task titles.
${FORMAT}`,
        userMessage: `${header}
Priority breakdown: URGENT: ${urgentTasks.length} | HIGH: ${highTasks.length} | MEDIUM: ${activeTasks.filter((t) => t.priority === "MEDIUM").length} | LOW: ${activeTasks.filter((t) => t.priority === "LOW").length}
URGENT+HIGH ratio: ${overloadRatio}% of active tasks
Stalled in-progress (2+ days idle): ${stalledInProgress.length}

Active tasks (all):
${activeTasks.map((t) => taskLine(t, now)).join("\n") || "No tasks."}`,
      };
    }

    // ─── BLOCKER_DETECTION ────────────────────────────────────────────────────
    case "BLOCKER_DETECTION": {
      const frozenProgress3d = inProgressTasks.filter(
        (t) => (now.getTime() - t.updatedAt.getTime()) / 86_400_000 > 3,
      );
      const critOverdue = overdueTasks.filter((t) => ["URGENT", "HIGH"].includes(t.priority));

      return {
        systemPrompt: `You are a project coach diagnosing blockers and workflow stalls.
STATUS: HEALTHY = nothing stuck | WARNING = some tasks idle or waiting | CRITICAL = important work stalled 3+ days.
For "Detected Metrics" include exact stall counts, idle durations, review queue depth.
For "Root Cause" — identify the specific sticking point (e.g., "2 tasks idle 5 days both in review stage with no reviewer assigned").
For "Do this first" — name the single action that unblocks the most work.
${FORMAT}`,
        userMessage: `${header}
Stalled in-progress (2+ days idle): ${stalledInProgress.length}
Frozen in-progress (3+ days): ${frozenProgress3d.length}
Stuck in review (2+ days): ${longInReview.length}
Review queue total: ${reviewTasks.length}
Critical overdue (URGENT+HIGH): ${critOverdue.length}

Stalled in-progress:
${stalledInProgress.map((t) => taskLine(t, now)).join("\n") || "(none)"}

Stuck in review (2+ days):
${longInReview.map((t) => taskLine(t, now)).join("\n") || "(none)"}

Urgent/high overdue:
${critOverdue.map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── SPRINT_IMPROVEMENTS ─────────────────────────────────────────────────
    case "SPRINT_IMPROVEMENTS": {
      const velocityDrop = completedLastWeek.length > 0
        ? Math.round(((completedLastWeek.length - completedThisWeek.length) / completedLastWeek.length) * 100)
        : 0;

      return {
        systemPrompt: `You are a project coach suggesting specific process improvements for next week.
STATUS: HEALTHY = good pace | WARNING = slow or uneven | CRITICAL = very little done or priorities piling up.
For "Detected Metrics" include this week vs last week velocity, stall count, overdue trend.
For "What to do" — 2–3 specific, tactical habits. No generic advice. Reference actual task patterns visible in the data.
For "Root Cause" — name the specific workflow pattern causing the slowdown.
${FORMAT}`,
        userMessage: `${header}
Completed this week: ${completedThisWeek.length}
Completed last week: ${completedLastWeek.length}
Velocity trend: ${velocityTrend}${velocityDrop > 0 ? ` (${velocityDrop}% slower)` : ""}
Stalled tasks: ${stalledInProgress.length} in-progress idle 2+ days
Stuck in review: ${longInReview.length}

Completed this week:
${completedThisWeek.map((t) => taskLine(t, now)).join("\n") || "(none)"}

Still in backlog/progress:
${activeTasks.slice(0, 10).map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── WEEKLY_SUMMARY ───────────────────────────────────────────────────────
    case "WEEKLY_SUMMARY": {
      return {
        systemPrompt: `You are a project coach writing a weekly recap.
STATUS: HEALTHY = good progress | WARNING = light week | CRITICAL = almost nothing done or overdue debt growing.
For "What's happening" — cite the biggest win this week by task title. Include velocity vs last week.
For "Do this first" — name the first task to tackle next week.
${FORMAT}`,
        userMessage: `${header}
Completed this week: ${completedThisWeek.length}
Completed last week: ${completedLastWeek.length}
Velocity trend: ${velocityTrend}
Overdue entering next week: ${overdueTasks.length}
Stalled tasks: ${stalledInProgress.length}

Done this week:
${completedThisWeek.map((t) => taskLine(t, now)).join("\n") || "(nothing done this week)"}

Still active (entering next week):
${activeTasks.slice(0, 8).map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── Automation-triggered types ───────────────────────────────────────────

    // ─── OVERDUE_RECOVERY ─────────────────────────────────────────────────────
    case "OVERDUE_RECOVERY": {
      const prioritySorted = [...overdueTasks].sort((a, b) => {
        const r: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (r[a.priority] ?? 2) - (r[b.priority] ?? 2);
      });

      const oldest = prioritySorted.reduce<TaskRow | null>((o, t) => {
        if (!t.dueDate) return o;
        if (!o || new Date(t.dueDate) < new Date(o.dueDate!)) return t;
        return o;
      }, null);
      const oldestDays = oldest?.dueDate
        ? Math.floor((now.getTime() - new Date(oldest.dueDate).getTime()) / 86_400_000)
        : 0;

      return {
        systemPrompt: `You are a recovery coach. This project has overdue tasks. Generate a concrete rescue plan.
STATUS: WARNING = 1–4 overdue | CRITICAL = 5+ overdue OR any URGENT overdue.
For "Detected Metrics" show exact overdue count by priority, oldest overdue duration.
For "What to do" — top 3 tasks to rescue (name them). Suggest one to defer.
For "Do this first" — the single task that unblocks the most if completed today.
${FORMAT}`,
        userMessage: `${header}

Overdue tasks (${overdueTasks.length} total):
URGENT: ${urgentOverdue.length} | HIGH: ${highOverdue.length} | MEDIUM+LOW: ${overdueTasks.filter((t) => !["URGENT", "HIGH"].includes(t.priority)).length}
Oldest overdue: ${oldest ? `"${oldest.title}" — ${pluralDays(oldestDays)} overdue` : "N/A"}

Overdue list (priority order):
${prioritySorted.map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── INACTIVE_PROJECT ─────────────────────────────────────────────────────
    case "INACTIVE_PROJECT": {
      const allTasks = [...activeTasks, ...doneTasks];
      const lastActive = allTasks.reduce(
        (latest, t) => (t.updatedAt > latest ? t.updatedAt : latest),
        new Date(0),
      );
      const daysSilent = Math.floor((now.getTime() - lastActive.getTime()) / 86_400_000);
      const recentDone = doneTasks.filter(
        (t) => (now.getTime() - t.updatedAt.getTime()) / 86_400_000 <= 14,
      ).length;

      return {
        systemPrompt: `You are a project reactivation coach. This project has gone quiet.
STATUS: WARNING = 3–6 days silent | CRITICAL = 7+ days silent.
For "Detected Metrics" include days silent, recent completion count, open active task count.
For "Root Cause" — explain WHY the project likely stalled based on the task data visible (e.g., all tasks are blocked, or tasks are vague with no due dates).
For "Do this first" — the single smallest action that restarts momentum today. Name a specific task.
${FORMAT}`,
        userMessage: `${header}
Last activity: ${pluralDays(daysSilent)} ago
Completed in last 14 days: ${recentDone}
Open active tasks: ${activeTasks.length}

Active tasks (stalled):
${activeTasks.slice(0, 8).map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── BLOCKED_WORKFLOW ─────────────────────────────────────────────────────
    case "BLOCKED_WORKFLOW": {
      const frozenProgress3d = inProgressTasks.filter(
        (t) => (now.getTime() - t.updatedAt.getTime()) / 86_400_000 > 3,
      );
      const maxReviewIdle = longInReview.reduce((max, t) => {
        const d = Math.floor((now.getTime() - t.updatedAt.getTime()) / 86_400_000);
        return d > max ? d : max;
      }, 0);

      return {
        systemPrompt: `You are a workflow unblocking coach. Tasks are piling up in review or frozen.
STATUS: WARNING = backlog piling | CRITICAL = tasks frozen 3+ days or review queue 4+.
For "Detected Metrics" include exact review queue size, frozen count, max idle duration, throughput.
For "Root Cause" — name the exact stage where work is choking (not just "review is slow").
For "Do this first" — the single action that clears the most blockage right now.
${FORMAT}`,
        userMessage: `${header}
Stuck in review (2+ days): ${longInReview.length} tasks (max idle: ${maxReviewIdle}d)
Frozen in-progress (3+ days): ${frozenProgress3d.length} tasks
Total review queue: ${reviewTasks.length}
Total in-progress: ${inProgressTasks.length}
Completion rate this week: ${completedThisWeek.length} tasks

Stuck in review:
${longInReview.map((t) => taskLine(t, now)).join("\n") || "(none)"}

Frozen in-progress (3+ days):
${frozenProgress3d.map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── PRODUCTIVITY_SLOWDOWN ────────────────────────────────────────────────
    case "PRODUCTIVITY_SLOWDOWN": {
      const dropPct = completedLastWeek.length > 0
        ? Math.round(((completedLastWeek.length - completedThisWeek.length) / completedLastWeek.length) * 100)
        : 0;

      return {
        systemPrompt: `You are a productivity coach detecting a velocity drop in a project.
STATUS: HEALTHY = stable or growing | WARNING = 20–49% drop | CRITICAL = 50%+ drop or nothing completed this week.
For "Detected Metrics" include this week vs last week counts, drop %, in-progress count, stall count.
For "Root Cause" — identify what specifically caused the drop (check if tasks piled up in review, or all in-progress items went stale, or priority tasks were deprioritized).
For "What to do" — two concrete unblocking actions. Reference actual stalled tasks by name.
${FORMAT}`,
        userMessage: `${header}
Completed last week: ${completedLastWeek.length}
Completed this week: ${completedThisWeek.length}
Velocity change: ${velocityTrend}${dropPct > 0 ? ` (${dropPct}% drop)` : ""}
Stalled in-progress (2+ days): ${stalledInProgress.length}
Stuck in review (2+ days): ${longInReview.length}

Stalled in-progress:
${stalledInProgress.map((t) => taskLine(t, now)).join("\n") || "(none)"}

Completed this week:
${completedThisWeek.map((t) => taskLine(t, now)).join("\n") || "(none)"}

Completed last week:
${completedLastWeek.map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── SPRINT_RISK ──────────────────────────────────────────────────────────
    case "SPRINT_RISK": {
      const highDueSoon = activeTasks.filter(
        (t) =>
          t.priority === "HIGH" &&
          t.dueDate &&
          new Date(t.dueDate) < new Date(now.getTime() + 7 * 86_400_000),
      );
      const atRisk = [...urgentTasks, ...highDueSoon]
        .filter((t, i, arr) => arr.findIndex((x) => x.title === t.title) === i)
        .slice(0, 6);

      return {
        systemPrompt: `You are a sprint risk analyst. Flag what may not get done and propose mitigation.
STATUS: HEALTHY = on track | WARNING = some items at risk | CRITICAL = sprint likely to fail.
For "Detected Metrics" include urgent active count, high-priority due this week, overdue count, completion rate.
For "Root Cause" — name the highest-risk tasks specifically and WHY they are at risk (due date + stall status).
For "What to do" — one item to defer, one to accelerate (name both).
${FORMAT}`,
        userMessage: `${header}
Urgent active: ${urgentTasks.length}
High-priority due this week: ${highDueSoon.length}
Overdue: ${overdueTasks.length}
Completion rate: ${completionRate}
Stalled urgent tasks: ${urgentTasks.filter((t) => (now.getTime() - t.updatedAt.getTime()) / 86_400_000 > 2).length}

At-risk tasks:
${atRisk.map((t) => taskLine(t, now)).join("\n") || "(none)"}

All urgent active:
${urgentTasks.map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── OVERLOAD_WARNING ─────────────────────────────────────────────────────
    case "OVERLOAD_WARNING": {
      const urgentPlusHigh = urgentTasks.length + highTasks.length;
      const overloadRatio = activeTasks.length > 0
        ? Math.round((urgentPlusHigh / activeTasks.length) * 100)
        : 0;

      return {
        systemPrompt: `You are a capacity coach detecting workload overload.
STATUS: HEALTHY = manageable | WARNING = overloaded | CRITICAL = critically overloaded with overdue debt.
For "Detected Metrics" include total active, priority breakdown, URGENT+HIGH ratio, overdue count.
For "Root Cause" — explain specifically what is creating the overload (e.g., "16 active tasks with 9 urgent/high-priority — task creation has outpaced completion by 3:1 this week").
For "What to do" — suggest 1 specific task to defer and 1 to cut or simplify. Name them.
${FORMAT}`,
        userMessage: `${header}
URGENT+HIGH ratio: ${overloadRatio}% (${urgentPlusHigh} of ${activeTasks.length} active tasks)
Overdue: ${overdueTasks.length}
Stalled: ${stalledInProgress.length}
Completed this week: ${completedThisWeek.length}

Urgent tasks:
${urgentTasks.map((t) => taskLine(t, now)).join("\n") || "(none)"}

High-priority tasks:
${highTasks.slice(0, 5).map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── STALE_CONTENT ────────────────────────────────────────────────────────
    case "STALE_CONTENT": {
      const lastDone = doneTasks.reduce<TaskRow | null>((latest, t) =>
        !latest || t.updatedAt > latest.updatedAt ? t : latest, null);
      const daysSinceLastDone = lastDone
        ? Math.floor((now.getTime() - lastDone.updatedAt.getTime()) / 86_400_000)
        : null;

      return {
        systemPrompt: `You are a project health coach. AI insights for this project have not been refreshed.
STATUS: WARNING = 5–9 days stale | CRITICAL = 10+ days stale or project idle.
For "Detected Metrics" include days since last insight refresh, days since last task completed, active task count.
For "Root Cause" — explain what the staleness means for the project (outdated insights may not reflect current blockers).
For "Do this first" — name the single insight type most important to regenerate based on active task data.
${FORMAT}`,
        userMessage: `${header}
Last task completed: ${daysSinceLastDone != null ? `${pluralDays(daysSinceLastDone)} ago ("${lastDone?.title}")` : "unknown"}
Open active tasks: ${activeTasks.length}
Overdue tasks: ${overdueTasks.length}
Stalled tasks: ${stalledInProgress.length}

Active tasks:
${activeTasks.slice(0, 6).map((t) => taskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── DEPENDENCY_ANALYSIS ──────────────────────────────────────────────────
    case "DEPENDENCY_ANALYSIS": {
      const dependencyKeywords = ["after", "before", "requires", "depends", "once", "following",
        "complete", "finish", "when", "prerequisite", "blocked by", "needs"];
      const tasksWithDepKeywords = activeTasks.filter((t) =>
        dependencyKeywords.some((kw) =>
          (t.title + " " + (t.description ?? "")).toLowerCase().includes(kw),
        ),
      );

      const suspectedBlockedTasks = activeTasks.filter(
        (t) => t.status === "TODO" && stalledInProgress.some(
          (s) => s.title.split(" ").some((w) => w.length > 4 && t.title.includes(w)),
        ),
      );

      const doneIndexed = doneTasks.map((t, i) => depTaskLine(t, i, now));
      const activeIndexed = activeTasks.map((t, i) => depTaskLine(t, i + doneTasks.length, now));

      return {
        systemPrompt: `You are a software project analyst specializing in task dependency mapping.
Tasks in this project do NOT have explicit dependency fields — infer relationships from:
  1. Title keywords (e.g., "Design login page" precedes "Implement login page" precedes "Test login page")
  2. Description text (look for phrases like "after completing", "requires", "depends on", "once X is done")
  3. Creation date ordering (earlier-created tasks often precede later ones in the same feature area)
  4. Status patterns (stalled IN_PROGRESS tasks often block downstream TODO tasks of the same feature)
  5. Shared topic clusters (tasks about the same feature area are likely sequentially dependent)

STATUS: HEALTHY = no risky dependency chains | WARNING = 1–2 at-risk chains | CRITICAL = a stalled task is blocking 3+ downstream tasks OR a blocked URGENT/HIGH task has an incomplete predecessor.

For "What's happening" — name the specific dependency chains you detect. Reference exact task titles with [T#] labels.
For "Detected Metrics" — count inferred dependency chains, tasks at risk due to incomplete predecessors, deepest chain length.
For "Root Cause" — name the single task (by exact title) whose incompletion creates the most downstream risk.
For "What to do" — list the top 2–3 dependency chain bottlenecks to resolve first, naming exact tasks.
For "Do this first" — the single task that, if completed, would unblock the most downstream work.
For "Why this matters" — quantify: how many tasks are blocked, what priority levels are affected.

QUALITY RULES:
- State your confidence for each dependency: "Strong: [T3] depends on [T1] — description says 'after completing authentication'."
- Never invent task names. Use exact titles from the data or [T#] reference labels.
- If you find NO dependency chains, say so clearly and explain why (all tasks appear independent).
- "Weak inference" dependencies are still useful — state them as weak, not as fact.
${FORMAT}`,
        userMessage: `${header}
Tasks with dependency keywords in title/description: ${tasksWithDepKeywords.length}
Suspected blocked TODO tasks (stalled IN_PROGRESS peer with overlapping title words): ${suspectedBlockedTasks.length}

ALL TASKS indexed for cross-reference — use [T#] labels in analysis:
--- DONE (completed prerequisites) ---
${doneIndexed.join("\n") || "(none)"}

--- ACTIVE (find dependency chains among these) ---
${activeIndexed.join("\n") || "(none)"}`,
      };
    }

    // ─── BLOCKER_CHAIN ────────────────────────────────────────────────────────
    case "BLOCKER_CHAIN": {
      const frozenProgress = inProgressTasks.filter(
        (t) => (now.getTime() - t.updatedAt.getTime()) / 86_400_000 > 3,
      );
      const deepReviewStall = reviewTasks.filter(
        (t) => (now.getTime() - t.updatedAt.getTime()) / 86_400_000 > 3,
      );

      const chainSizes = stalledInProgress.map((stalled) => {
        const keywords = stalled.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
        const downstream = todoTasks.filter((todo) =>
          keywords.some((kw) => todo.title.toLowerCase().includes(kw)),
        );
        return { stalled, downstreamCount: downstream.length, downstream: downstream.slice(0, 3) };
      }).sort((a, b) => b.downstreamCount - a.downstreamCount);

      const maxChainImpact = chainSizes[0];
      const totalDownstreamAtRisk = chainSizes.reduce((sum, c) => sum + c.downstreamCount, 0);

      return {
        systemPrompt: `You are a project unblocking analyst specializing in cascade failure detection.

A "blocker chain" is: Task A must complete before Task B can start, and Task B must complete before Task C can start.
Chains are most dangerous when a high-priority task sits mid-chain.

Identify chains by:
  1. REVIEW tasks frozen 2+ days — anything awaiting review blocks IN_PROGRESS work from progressing to DONE
  2. IN_PROGRESS tasks idle 3+ days — if multiple tasks share feature keywords, the stalled one blocks the others
  3. TODO tasks sharing title/feature keywords with a frozen REVIEW or stalled IN_PROGRESS task

STATUS: HEALTHY = no chains or chains only affect LOW/MEDIUM tasks | WARNING = chains affect HIGH tasks or depth ≥ 2 | CRITICAL = chain depth 3+ OR URGENT task is blocked mid-chain.

For "What's happening" — name each blocker chain. Format: [stalled task] → [blocked task] → [further downstream]. Use exact task titles.
For "Detected Metrics" — chain count, total tasks blocked, longest chain depth, highest-priority blocked task, days the head blocker has been frozen.
For "Root Cause" — name the single root blocker (exact title) that, if resolved, would unfreeze the most work.
For "What to do" — one action per chain (name the stalled task to fix). For REVIEW chains: name who needs to approve and which task needs review.
For "Do this first" — name the task to unblock first. Explain exactly what "unblock" means here (approve the review, finish the implementation, assign a reviewer).
For "Why this matters" — if the root blocker is NOT resolved this week, name the highest-priority task that will miss its deadline as a result.

QUALITY RULES:
- Never write "tasks are blocked" — always name the specific task being blocked AND the specific blocker.
- Use the actual idle duration from the data (e.g., "idle 5 days" not "idle for a while").
- If you cannot infer a chain, say "no clear chain detected for this task" rather than guessing.
${FORMAT}`,
        userMessage: `${header}
Stalled IN_PROGRESS (2+ days idle): ${stalledInProgress.length}
Frozen IN_PROGRESS (3+ days idle): ${frozenProgress.length}
Stuck in REVIEW (2+ days): ${longInReview.length}
Frozen in REVIEW (3+ days): ${deepReviewStall.length}
Review pipeline depth: ${reviewTasks.length} tasks queued
Estimated downstream tasks at risk: ${totalDownstreamAtRisk}

${maxChainImpact ? `Highest-impact suspected chain:
  Root blocker: "${maxChainImpact.stalled.title}" (idle ${Math.floor((now.getTime() - maxChainImpact.stalled.updatedAt.getTime()) / 86_400_000)}d)
  Likely downstream: ${maxChainImpact.downstreamCount} tasks (sample: ${maxChainImpact.downstream.map((t) => `"${t.title}"`).join(", ") || "none matched"})` : "No clear chain root detected."}

Stalled IN_PROGRESS (potential chain heads):
${stalledInProgress.map((t) => richTaskLine(t, now)).join("\n") || "(none)"}

Stuck in REVIEW (pipeline blockers):
${longInReview.map((t) => richTaskLine(t, now)).join("\n") || "(none)"}

TODO tasks potentially waiting (downstream candidates):
${todoTasks.slice(0, 8).map((t) => richTaskLine(t, now)).join("\n") || "(none)"}

URGENT/HIGH overdue (already cascading):
${overdueTasks.filter((t) => ["URGENT", "HIGH"].includes(t.priority)).map((t) => richTaskLine(t, now)).join("\n") || "(none)"}`,
      };
    }

    // ─── SPRINT_FORECAST ──────────────────────────────────────────────────────
    case "SPRINT_FORECAST": {
      const oneWeekAhead = new Date(now.getTime() + 7 * 86_400_000);
      const twoWeeksAhead = new Date(now.getTime() + 14 * 86_400_000);

      const dueInOneWeek = activeTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) <= oneWeekAhead,
      );
      const dueInTwoWeeks = activeTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) > oneWeekAhead && new Date(t.dueDate) <= twoWeeksAhead,
      );

      const currentWip = inProgressTasks.length + reviewTasks.length;
      const avgWeeklyVelocity = completedLastWeek.length > 0
        ? Math.round((completedThisWeek.length + completedLastWeek.length) / 2)
        : completedThisWeek.length;

      const shortfallThisWeek = Math.max(0, dueInOneWeek.length - avgWeeklyVelocity);

      const atRiskThisWeek = dueInOneWeek.filter(
        (t) => t.status === "TODO" || (now.getTime() - t.updatedAt.getTime()) / 86_400_000 > 2,
      );
      const likelyToSlip = atRiskThisWeek.filter((t) => ["URGENT", "HIGH"].includes(t.priority));

      return {
        systemPrompt: `You are a sprint forecasting analyst predicting project completion probability.

Base your forecast on:
  - Average weekly velocity (tasks completed/week, last 2 weeks)
  - Current WIP (in-progress + review) vs historical completion rate
  - Tasks due in next 7 days and their current status
  - Stalled tasks that won't be ready in time
  - Overdue backlog that competes for capacity

STATUS: HEALTHY = on track to meet all due dates this week | WARNING = 1–2 tasks likely to slip | CRITICAL = velocity is less than half of what's needed OR URGENT tasks will miss deadline.

For "What's happening" — state the forecast directly: "At ${avgWeeklyVelocity} tasks/week average, you can complete approximately X tasks this week. These tasks will likely slip: [name them]."
For "Detected Metrics" — avg weekly velocity, tasks due this week, tasks due next week, WIP count, at-risk count, overdue carryover.
For "Root Cause" — explain the specific gap: "Velocity of X/week vs Y tasks due, compounded by Z stalled tasks consuming capacity without producing completions."
For "What to do" — 1: name the highest-priority at-risk task and what specifically to do to get it done this week. 2: name a lower-priority task to defer to relieve pressure. 3 (if applicable): the stall to clear first.
For "Do this first" — the single most important task to focus on today to prevent a slip. Name it explicitly.
For "Why this matters" — if the forecast plays out and these tasks slip, name the concrete downstream consequence (which deadline, which feature, which deliverable is at risk).

QUALITY RULES:
- Use the actual velocity numbers — never write "low velocity" without the exact count.
- Every at-risk task you name must be from the data above.
- "Likely to slip" = due within 7 days AND (status is TODO OR idle 2+ days). State the reason for each.
${FORMAT}`,
        userMessage: `${header}
--- FORECAST INPUTS ---
Avg weekly velocity (last 2 weeks): ${avgWeeklyVelocity} tasks/week
  This week completed: ${completedThisWeek.length} | Last week: ${completedLastWeek.length} | Trend: ${velocityTrend}
Current WIP (in-progress + review): ${currentWip}
Overdue carryover: ${overdueTasks.length}

--- UPCOMING DEADLINES ---
Due within 7 days: ${dueInOneWeek.length} tasks (capacity: ~${avgWeeklyVelocity})
  At-risk (not started or stalled): ${atRiskThisWeek.length}
  URGENT/HIGH likely to slip: ${likelyToSlip.length}
  ${shortfallThisWeek > 0 ? `Shortfall: ${shortfallThisWeek} tasks more than velocity` : "Capacity appears sufficient"}
Due in 8–14 days: ${dueInTwoWeeks.length} tasks (early warning)

--- AT-RISK TASKS (due ≤7 days, not started or stalled) ---
${atRiskThisWeek.map((t) => richTaskLine(t, now)).join("\n") || "(none — all due-this-week tasks are progressing)"}

--- ALL DUE THIS WEEK ---
${dueInOneWeek.map((t) => richTaskLine(t, now)).join("\n") || "(none with due dates this week)"}

--- DUE IN 2 WEEKS (early warning) ---
${dueInTwoWeeks.slice(0, 5).map((t) => richTaskLine(t, now)).join("\n") || "(none)"}

--- STALLED TASKS CONSUMING CAPACITY ---
${stalledInProgress.map((t) => richTaskLine(t, now)).join("\n") || "(none stalled)"}`,
      };
    }

    // ─── DELAY_IMPACT ─────────────────────────────────────────────────────────
    case "DELAY_IMPACT": {
      const tasksWithDueDates = activeTasks.filter((t) => t.dueDate);
      const sortedByDue = [...tasksWithDueDates].sort(
        (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
      );

      const criticalInProgress = inProgressTasks
        .filter((t) => ["URGENT", "HIGH"].includes(t.priority))
        .sort((a, b) => {
          const prioOrder: Record<string, number> = { URGENT: 0, HIGH: 1 };
          return (prioOrder[a.priority] ?? 1) - (prioOrder[b.priority] ?? 1);
        });

      const overdueDelayDays = overdueTasks.map((t) =>
        t.dueDate ? Math.floor((now.getTime() - new Date(t.dueDate).getTime()) / 86_400_000) : 0,
      );
      const totalOverdueDelay = overdueDelayDays.reduce((sum, d) => sum + d, 0);
      const maxSingleDelay = Math.max(0, ...overdueDelayDays);
      const worstDelayTask = overdueTasks[overdueDelayDays.indexOf(maxSingleDelay)];

      const urgentHighDueSoon = sortedByDue.filter(
        (t) => ["URGENT", "HIGH"].includes(t.priority),
      ).slice(0, 5);

      const rippleEstimates = criticalInProgress.slice(0, 4).map((task) => {
        const keywords = task.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
        const affected = todoTasks.filter((todo) =>
          keywords.some((kw) => todo.title.toLowerCase().includes(kw)),
        ).length;
        const idleDays = Math.floor((now.getTime() - task.updatedAt.getTime()) / 86_400_000);
        return { task, affected, idleDays };
      });

      return {
        systemPrompt: `You are a project risk analyst specializing in delay cascade modeling.

For each at-risk or overdue task, estimate downstream impact if it slips by 3–7 days:
  - Which tasks likely cannot start until this one completes? (infer from title keywords, description, logical ordering)
  - How many additional days of delay would cascade downstream?
  - What is the highest-priority task blocked by this delay?
  - What is the total "delay debt" accumulated from current overdue tasks?

STATUS: HEALTHY = no active delays or all delays affect LOW/MEDIUM tasks | WARNING = HIGH task overdue or delay debt 5+ days | CRITICAL = URGENT task delayed OR total delay debt causes a project deadline miss.

For "What's happening" — state the current delay picture: "X tasks are already late by Y total accumulated days. The highest-risk delay is '[task]' — [priority], [N] days overdue, likely blocking [downstream task]."
For "Detected Metrics" — overdue count, total accumulated delay (sum of overdue days), single worst delay (task + days), tasks at risk of slipping this week, estimated downstream tasks affected.
For "Root Cause" — identify the specific task whose delay creates the most cascade risk. Explain WHY it's delayed based on the data (idle? review waiting? unassigned?).
For "What to do" — 1: resolve the worst current delay (name the task + specific step). 2: prevent the next at-risk task from becoming overdue (name it + what to do). 3 (if applicable): deprioritize one LOW task to free capacity for critical path.
For "Do this first" — the single overdue or at-risk task that, if resolved today, stops the most cascading damage. Name the exact task and exact action.
For "Why this matters" — if current overdue tasks remain unresolved for another 7 days, what is the projected cumulative delay? Name the highest-priority deliverable at risk.

QUALITY RULES:
- Use exact delay numbers (days overdue = today minus due date).
- Name every at-risk task by exact title — no placeholders.
- "Cascade" must be grounded in actual evidence (title keywords, description, or status patterns).
- If overdue count is 0, say HEALTHY and focus on tasks at risk of becoming overdue within 3 days.
${FORMAT}`,
        userMessage: `${header}
--- CURRENT DELAY STATUS ---
Already overdue: ${overdueTasks.length} tasks
Total accumulated delay: ${totalOverdueDelay} days across all overdue tasks
Worst single delay: ${worstDelayTask ? `"${worstDelayTask.title}" — ${maxSingleDelay}d overdue` : "none"}
URGENT overdue: ${urgentOverdue.length} | HIGH overdue: ${highOverdue.length}

--- AT-RISK THIS WEEK (due ≤7 days, URGENT/HIGH) ---
${urgentHighDueSoon.map((t) => richTaskLine(t, now)).join("\n") || "(none)"}

--- CRITICAL IN-PROGRESS (highest risk of slipping) ---
${criticalInProgress.slice(0, 5).map((t) => richTaskLine(t, now)).join("\n") || "(none)"}

--- RIPPLE ESTIMATES (if task slips, est. downstream impact) ---
${rippleEstimates.map((r) => `"${r.task.title}" [${r.task.priority}] idle ${r.idleDays}d → ~${r.affected} downstream tasks share title keywords`).join("\n") || "(insufficient data for ripple estimates)"}

--- FULL OVERDUE LIST ---
${overdueTasks.map((t) => richTaskLine(t, now)).join("\n") || "(none overdue)"}

--- UPCOMING DUE DATES (next 14 days) ---
${sortedByDue.slice(0, 8).map((t) => richTaskLine(t, now)).join("\n") || "(no due dates set)"}`,
      };
    }

    // ─── WORKLOAD_IMBALANCE ───────────────────────────────────────────────────
    case "WORKLOAD_IMBALANCE": {
      const assigneeGroups = new Map<string, TaskRow[]>();
      for (const task of activeTasks) {
        const names = task.assignees.length > 0 ? task.assignees : ["(Unassigned)"];
        for (const name of names) {
          if (!assigneeGroups.has(name)) assigneeGroups.set(name, []);
          assigneeGroups.get(name)!.push(task);
        }
      }

      const sorted = Array.from(assigneeGroups.entries()).sort(
        (a, b) => b[1].length - a[1].length,
      );

      const totalAssigned = activeTasks.filter((t) => t.assignees.length > 0).length;
      const unassignedCount = activeTasks.filter((t) => t.assignees.length === 0).length;
      const unassignedCritical = activeTasks.filter(
        (t) => t.assignees.length === 0 && ["URGENT", "HIGH"].includes(t.priority),
      );

      const namedAssignees = sorted.filter(([name]) => name !== "(Unassigned)");
      const avgTasksPerPerson = namedAssignees.length > 0
        ? Math.round(totalAssigned / namedAssignees.length)
        : 0;
      const overloaded = namedAssignees.filter(([, tasks]) => tasks.length >= 5);
      const underloaded = namedAssignees.filter(([, tasks]) => tasks.length <= 1);

      const assigneeSummary = sorted.map(([name, tasks]) => {
        const urgentCount = tasks.filter((t) => t.priority === "URGENT").length;
        const highCount = tasks.filter((t) => t.priority === "HIGH").length;
        const overdueCount = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
        const stalledCount = tasks.filter(
          (t) => (now.getTime() - t.updatedAt.getTime()) / 86_400_000 > 2,
        ).length;
        const sample = tasks.slice(0, 3).map((t) => `"${t.title}" [${t.priority}]`).join(", ");
        return `${name}: ${tasks.length} tasks | URGENT:${urgentCount} HIGH:${highCount} overdue:${overdueCount} stalled:${stalledCount}\n  Tasks: ${sample}${tasks.length > 3 ? ` +${tasks.length - 3} more` : ""}`;
      });

      return {
        systemPrompt: `You are a workload balance analyst identifying team capacity problems.

Analyze the assignee-to-task distribution to identify:
  1. Overloaded individuals (5+ tasks, or 3+ URGENT/HIGH tasks, or 2+ overdue tasks)
  2. Underloaded individuals (≤1 active task) who could absorb redistribution
  3. Unassigned critical tasks (URGENT/HIGH with no assignee = orphaned critical work)
  4. Stall concentration (one person holding multiple stalled tasks = single-point bottleneck)
  5. Imbalance ratio (most loaded vs least loaded persons)

STATUS: HEALTHY = balanced load, no unassigned URGENT/HIGH tasks | WARNING = one person has 2× more tasks than average OR unassigned HIGH tasks exist | CRITICAL = URGENT tasks unassigned OR one person has 3× average load with active overdue tasks.

For "What's happening" — name overloaded and underloaded assignees by name. State the imbalance ratio ("Alice has 8 tasks vs Bob's 2 — 4× imbalance").
For "Detected Metrics" — total assignees, avg tasks/person (${avgTasksPerPerson}), max/min tasks, unassigned count, unassigned critical count, overloaded persons, underloaded persons.
For "Root Cause" — identify the specific cause of imbalance (e.g., "All URGENT tasks are assigned to Alice, who already carries 6 tasks and has 2 overdue items.").
For "What to do" — 1: name a specific task to reassign (from whom → to whom). 2: name a specific unassigned critical task to assign (to whom). 3 (if applicable): suggest a task for the overloaded person to defer.
For "Do this first" — the single highest-impact reassignment or assignment. Name the task AND the person.
For "Why this matters" — if the overloaded person gets blocked or sick, name exactly which tasks would stall and what they would affect.

QUALITY RULES:
- Use real assignee names from the data — never "Team Member A".
- Name specific tasks in reassignment suggestions.
- If all tasks are unassigned, say so clearly and recommend assigning the top 3 URGENT/HIGH tasks as the first step.
- If only 1 person is assigned to everything, flag it as a single-point-of-failure risk.
${FORMAT}`,
        userMessage: `${header}
--- WORKLOAD DISTRIBUTION ---
Named assignees: ${namedAssignees.length}
Average tasks per person: ${avgTasksPerPerson}
Unassigned active tasks: ${unassignedCount}
Unassigned URGENT/HIGH tasks: ${unassignedCritical.length}
Overloaded (5+ tasks): ${overloaded.map(([name]) => name).join(", ") || "none"}
Underloaded (≤1 task): ${underloaded.map(([name]) => name).join(", ") || "none"}

--- PER-ASSIGNEE BREAKDOWN ---
${assigneeSummary.join("\n\n") || "(no assignments — all tasks unassigned)"}

--- UNASSIGNED CRITICAL TASKS ---
${unassignedCritical.map((t) => taskLine(t, now)).join("\n") || "(none — all URGENT/HIGH tasks are assigned)"}`,
      };
    }

    // ─── STALL_ANALYSIS ───────────────────────────────────────────────────────
    case "STALL_ANALYSIS": {
      const stalledAll = activeTasks.filter(
        (t) => (now.getTime() - t.updatedAt.getTime()) / 86_400_000 >= 3,
      ).sort((a, b) => {
        const prioOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const pd = (prioOrder[a.priority] ?? 2) - (prioOrder[b.priority] ?? 2);
        if (pd !== 0) return pd;
        return a.updatedAt.getTime() - b.updatedAt.getTime(); // longest idle first
      });

      const stalledUrgent = stalledAll.filter((t) => t.priority === "URGENT");
      const stalledHigh = stalledAll.filter((t) => t.priority === "HIGH");
      const stalledByStatus = {
        IN_PROGRESS: stalledAll.filter((t) => t.status === "IN_PROGRESS").length,
        REVIEW: stalledAll.filter((t) => t.status === "REVIEW").length,
        TODO: stalledAll.filter((t) => t.status === "TODO").length,
      };

      const longestIdleTask = stalledAll.reduce<TaskRow | null>((worst, t) =>
        !worst || t.updatedAt < worst.updatedAt ? t : worst, null);
      const longestIdleDays = longestIdleTask
        ? Math.floor((now.getTime() - longestIdleTask.updatedAt.getTime()) / 86_400_000)
        : 0;

      const avgIdleDays = stalledAll.length > 0
        ? Math.round(
          stalledAll.reduce(
            (sum, t) => sum + Math.floor((now.getTime() - t.updatedAt.getTime()) / 86_400_000),
            0,
          ) / stalledAll.length,
        )
        : 0;

      return {
        systemPrompt: `You are a project stall specialist. Every task idle 3+ days is a problem — diagnose and prescribe a specific fix for each one.

For each stalled task, determine:
  1. WHY it is stalled — use status, description, and assignee as clues:
     - IN_PROGRESS + unassigned = likely abandoned or forgotten
     - IN_PROGRESS + idle 7+ days = possibly blocked waiting on external input or decision
     - REVIEW + idle 3+ days = no reviewer engaged or no clear owner for the review
     - TODO + idle 5+ days = orphaned (missing context, blocked prerequisite, or silently deprioritized)
  2. WHAT the specific recovery action is — not "resume the task" but the exact step:
     - "Assign @name to review [task] by [specific date]"
     - "Break '[task]' into smaller subtasks — scope is likely unclear"
     - "Check if [predecessor] is complete first — this task may be blocked"
     - "Cancel '[task]' if no longer relevant — it's been idle Xd with no activity"

STATUS: HEALTHY = no stalls 3+ days | WARNING = 1–3 stalled tasks or all stalls are LOW/MEDIUM | CRITICAL = 4+ stalled tasks OR URGENT/HIGH task idle 5+ days.

For "What's happening" — total stall count, priority breakdown, average idle days.
For "Detected Metrics" — stalled by status (IN_PROGRESS/REVIEW/TODO), URGENT stalled, HIGH stalled, avg idle, worst idle (task + days).
For "Root Cause" — the systemic cause across ALL stalled tasks (e.g., "Review stage has become a graveyard — 4 tasks waiting for approval with no reviewer assigned").
For "What to do" — for each stalled task (up to 5 by priority), one line:
  "• '[Task Title]' [PRIORITY, STATUS, Xd idle] → [specific action]"
For "Do this first" — the single highest-priority stall to resolve. Name the task, state the idle time, give the EXACT recovery action.
For "Why this matters" — if these stalls persist another week, how many tasks will miss due dates? Name the highest-priority one.

QUALITY RULES:
- Diagnose each stalled task individually using its data — status, priority, assignees, description, idle time.
- "What to do" must have one bullet per task (up to 5), not generic advice.
- Use exact task titles and exact idle durations.
- Always note when a task has no assignee — it's a critical signal.
${FORMAT}`,
        userMessage: `${header}
--- STALL OVERVIEW ---
Total stalled (3+ days idle): ${stalledAll.length}
  IN_PROGRESS stalled: ${stalledByStatus.IN_PROGRESS}
  REVIEW stalled: ${stalledByStatus.REVIEW}
  TODO stalled: ${stalledByStatus.TODO}
URGENT stalled: ${stalledUrgent.length} | HIGH stalled: ${stalledHigh.length}
Average idle: ${avgIdleDays}d | Worst: "${longestIdleTask?.title ?? "none"}" at ${longestIdleDays}d idle

--- STALLED TASKS (priority order — diagnose each one individually) ---
${stalledAll.map((t) => stallBlock(t, now)).join("\n\n") || "(no tasks stalled 3+ days)"}`,
      };
    }

    // ─── CRITICAL_PATH ────────────────────────────────────────────────────────
    case "CRITICAL_PATH": {
      const withDueDates = activeTasks.filter((t) => t.dueDate).sort(
        (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
      );

      const criticalCandidates = activeTasks
        .filter((t) => ["URGENT", "HIGH"].includes(t.priority))
        .sort((a, b) => {
          const prioOrder: Record<string, number> = { URGENT: 0, HIGH: 1 };
          return (prioOrder[a.priority] ?? 1) - (prioOrder[b.priority] ?? 1);
        });

      const potentialPrerequisites = activeTasks.filter((task) => {
        const taskKeywords = task.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
        return activeTasks.some(
          (other) =>
            other !== task &&
            other.createdAt > task.createdAt &&
            taskKeywords.some((kw) => other.title.toLowerCase().includes(kw)),
        );
      });

      const completedMilestones = doneTasks
        .filter((t) => ["URGENT", "HIGH"].includes(t.priority))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5);

      const criticalPathAtRisk = criticalCandidates.filter(
        (t) =>
          (t.dueDate && new Date(t.dueDate) < now) ||
          (now.getTime() - t.updatedAt.getTime()) / 86_400_000 > 2,
      );

      const undatedCritical = criticalCandidates.filter((t) => !t.dueDate);

      return {
        systemPrompt: `You are a critical-path analyst. Your job is to identify which sequence of tasks, if delayed, would most directly push out the project's completion date.

This project has NO explicit dependency fields. Infer the critical path from:
  1. High-priority + earliest due dates = most time-constrained tasks
  2. Creation date ordering + shared title keywords = likely sequential dependency
  3. IN_PROGRESS tasks that multiple TODO tasks seem to follow (overlapping feature keywords)
  4. Tasks with no due date but URGENT/HIGH priority = hidden schedule risk (undated critical work)
  5. Completed milestones (DONE high-priority tasks) — use these to understand sequencing history

The critical path = the longest chain of sequentially dependent tasks. Delaying any task on the path delays the whole project.

STATUS: HEALTHY = critical path tasks are on track | WARNING = 1 critical path task stalled or 1–3 days behind | CRITICAL = critical path task overdue OR URGENT task blocked mid-path.

For "What's happening" — describe the critical path: "The critical path runs through [Task A] → [Task B] → [Task C], based on [evidence]. [Task X] is the highest-risk node — [priority, status, stall/overdue status]."
For "Detected Metrics" — inferred critical path length (tasks), critical path tasks at risk, total critical-path delay already accumulated (days), URGENT/HIGH tasks without due dates (hidden risk count).
For "Root Cause" — name the single most dangerous critical-path node. Why is it most dangerous? (e.g., "No assignee, 4 days idle, and 3 HIGH tasks appear to depend on it based on shared title keywords.")
For "What to do" — 1: protect the highest-risk critical-path task (name it, specific action). 2: assign due dates to URGENT/HIGH tasks that have none (name them — they are invisible schedule risks). 3 (if applicable): identify one non-critical task to deprioritize to free capacity for the path.
For "Do this first" — the single action that most protects the critical path today. Name the exact task and exact action.
For "Why this matters" — if the critical-path task you identified slips by 7 days, what is the projected project-end impact? Be specific about which features or deliverables would be delayed.

QUALITY RULES:
- The critical path must be a named sequence of actual tasks — not a description of a category.
- State inference evidence for each dependency: "T3 likely follows T1 because both titles contain 'authentication' and T3 was created 2 days after T1."
- If the critical path is unclear, focus on the single highest-priority task as the minimum critical path and say so.
- Use [T#] labels from the indexed task list to cross-reference tasks in chains.
${FORMAT}`,
        userMessage: `${header}
--- CRITICAL PATH INPUTS ---
Completed high-priority milestones (project history):
${completedMilestones.map((t, i) => depTaskLine(t, i, now)).join("\n") || "(none)"}

URGENT + HIGH active tasks (critical path candidates):
${criticalCandidates.slice(0, 10).map((t, i) => depTaskLine(t, i, now)).join("\n") || "(none)"}

Critical path tasks at risk (overdue or stalled):
${criticalPathAtRisk.map((t, i) => depTaskLine(t, i, now)).join("\n") || "(none)"}

Potential prerequisites (shared keywords + earlier creation):
${potentialPrerequisites.slice(0, 6).map((t, i) => depTaskLine(t, i, now)).join("\n") || "(none detected)"}

Time-constrained tasks (have due dates, sorted soonest first):
${withDueDates.slice(0, 8).map((t, i) => depTaskLine(t, i, now)).join("\n") || "(no due dates set)"}

URGENT/HIGH WITHOUT due dates (hidden schedule risk):
${undatedCritical.map((t, i) => depTaskLine(t, i, now)).join("\n") || "(all critical tasks have due dates)"}`,
      };
    }
  }
}
