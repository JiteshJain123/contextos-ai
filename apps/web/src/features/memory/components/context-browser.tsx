"use client";

import { useState } from "react";
import {
  ListChecks,
  FileText,
  Lightbulb,
  MessageSquare,
  Map,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import type {
  ProjectMemoryDTO,
  TaskMemoryItem,
  DocumentMemoryItem,
  InsightMemoryItem,
  ConversationMemoryItem,
} from "@contextos-ai/validators/memory";
import { cn } from "@/lib/cn";

// ── Tab definition ────────────────────────────────────────────────────────────

type TabId = "tasks" | "documents" | "insights" | "conversations" | "plan";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "conversations", label: "Chats", icon: MessageSquare },
  { id: "plan", label: "Plan", icon: Map },
];

// ── Task browser ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  DONE: { icon: CheckCircle2, color: "text-green-500" },
  IN_PROGRESS: { icon: Loader2, color: "text-blue-500" },
  REVIEW: { icon: Clock, color: "text-amber-500" },
  TODO: { icon: Clock, color: "text-muted-foreground" },
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "text-red-500 bg-red-50 dark:bg-red-950",
  HIGH: "text-orange-500 bg-orange-50 dark:bg-orange-950",
  MEDIUM: "text-blue-500 bg-blue-50 dark:bg-blue-950",
  LOW: "text-muted-foreground bg-muted",
};

function TasksTab({ tasks }: { tasks: TaskMemoryItem[] }) {
  if (tasks.length === 0) {
    return <EmptyState message="No tasks indexed in memory" />;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {tasks.slice(0, 30).map((task, i) => {
        const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.TODO!;
        const StatusIcon = statusCfg.icon;
        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
          >
            <StatusIcon className={cn("size-3.5 shrink-0", statusCfg.color)} />
            <span className="flex-1 text-xs font-medium line-clamp-1">{task.title}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                PRIORITY_COLORS[task.priority] ?? "bg-muted text-muted-foreground",
              )}
            >
              {task.priority[0]}
            </span>
          </motion.div>
        );
      })}
      {tasks.length > 30 && (
        <p className="text-center text-xs text-muted-foreground pt-1">
          +{tasks.length - 30} more tasks indexed
        </p>
      )}
    </div>
  );
}

// ── Documents browser ─────────────────────────────────────────────────────────

function DocumentsTab({ documents }: { documents: DocumentMemoryItem[] }) {
  if (documents.length === 0) {
    return <EmptyState message="No documents indexed in memory" />;
  }
  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc, i) => (
        <motion.div
          key={doc.id}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-xl border border-border bg-card p-3"
        >
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 size-3.5 shrink-0 text-violet-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold line-clamp-1">{doc.originalName}</p>
              {doc.summary && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{doc.summary}</p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {doc.requirementCount > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {doc.requirementCount} req
                  </span>
                )}
                {doc.deadlineCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    {doc.deadlineCount} deadline{doc.deadlineCount !== 1 ? "s" : ""}
                  </span>
                )}
                {doc.riskCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700 dark:bg-red-950 dark:text-red-300">
                    {doc.riskCount} risk{doc.riskCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                doc.status === "READY"
                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {doc.status}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Insights browser ──────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  WARNING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  INFO: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

function InsightsTab({ insights }: { insights: InsightMemoryItem[] }) {
  if (insights.length === 0) {
    return <EmptyState message="No insights indexed in memory" />;
  }
  return (
    <div className="flex flex-col gap-2">
      {insights.map((insight, i) => (
        <motion.div
          key={insight.id}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-xl border border-border bg-card p-3"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">
                  {insight.type.replace(/_/g, " ")}
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    SEVERITY_COLORS[insight.severity] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {insight.severity}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {insight.contentPreview}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Conversations browser ─────────────────────────────────────────────────────

function ConversationsTab({ conversations }: { conversations: ConversationMemoryItem[] }) {
  if (conversations.length === 0) {
    return <EmptyState message="No conversations indexed in memory" />;
  }
  return (
    <div className="flex flex-col gap-2">
      {conversations.map((conv, i) => (
        <motion.div
          key={conv.id}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-xl border border-border bg-card p-3"
        >
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-pink-500" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold line-clamp-1">{conv.title}</span>
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {conv.messageCount} msg
                </span>
              </div>
              {conv.recentSummary && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {conv.recentSummary}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Plan browser ──────────────────────────────────────────────────────────────

function PlanTab({ planSummary }: { planSummary: string | null }) {
  if (!planSummary) {
    return <EmptyState message="No project plan indexed in memory" />;
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Map className="size-3.5 text-emerald-500" />
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Project Plan</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {planSummary}
      </p>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <AlertCircle className="size-6 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ContextBrowserProps {
  memory: ProjectMemoryDTO;
}

// ── Main component ────────────────────────────────────────────────────────────

export function ContextBrowser({ memory }: ContextBrowserProps) {
  const [activeTab, setActiveTab] = useState<TabId>("tasks");

  const counts: Record<TabId, number> = {
    tasks: memory.tasks.length,
    documents: memory.documents.length,
    insights: memory.insights.length,
    conversations: memory.conversations.length,
    plan: memory.planSummary ? 1 : 0,
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar */}
      <div className="flex gap-0.5 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all whitespace-nowrap",
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
            {counts[id] > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                activeTab === id ? "bg-muted" : "bg-muted/60",
              )}>
                {counts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-h-[480px] overflow-y-auto pr-0.5">
        {activeTab === "tasks" && <TasksTab tasks={memory.tasks} />}
        {activeTab === "documents" && <DocumentsTab documents={memory.documents} />}
        {activeTab === "insights" && <InsightsTab insights={memory.insights} />}
        {activeTab === "conversations" && <ConversationsTab conversations={memory.conversations} />}
        {activeTab === "plan" && <PlanTab planSummary={memory.planSummary} />}
      </div>
    </div>
  );
}
