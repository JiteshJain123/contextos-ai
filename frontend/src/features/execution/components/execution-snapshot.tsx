"use client";

import { motion } from "motion/react";
import { CheckCircle2, Activity, Eye, AlertTriangle, Flame } from "lucide-react";

import { cn } from "@/lib/cn";

// ─── Single metric card ───────────────────────────────────────────────────────

interface SnapshotCardProps {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  iconClass: string;
  valueClass: string;
  index: number;
}

function SnapshotCard({ icon: Icon, label, value, iconClass, valueClass, index }: SnapshotCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.05, ease: "easeOut" }}
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("size-3.5 shrink-0", iconClass)} />
      </div>
      <span className={cn("text-2xl font-extrabold tabular-nums leading-none", valueClass)}>
        {value}
      </span>
    </motion.div>
  );
}

// ─── Snapshot section ─────────────────────────────────────────────────────────

interface ExecutionSnapshotProps {
  doneTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  overdueTasks: number;
  criticalTasks: number;
}

export function ExecutionSnapshot({
  doneTasks,
  inProgressTasks,
  reviewTasks,
  overdueTasks,
  criticalTasks,
}: ExecutionSnapshotProps) {
  const cards = [
    {
      label: "Done",
      value: doneTasks,
      icon: CheckCircle2,
      iconClass: "text-emerald-500",
      valueClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "In Progress",
      value: inProgressTasks,
      icon: Activity,
      iconClass: "text-blue-500",
      valueClass: "",
    },
    {
      label: "Review",
      value: reviewTasks,
      icon: Eye,
      iconClass: "text-purple-500",
      valueClass: "",
    },
    {
      label: "Overdue",
      value: overdueTasks,
      icon: AlertTriangle,
      iconClass: overdueTasks > 0 ? "text-red-500" : "text-muted-foreground/30",
      valueClass: overdueTasks > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground/40",
    },
    {
      label: "Critical",
      value: criticalTasks,
      icon: Flame,
      iconClass: criticalTasks > 0 ? "text-orange-500" : "text-muted-foreground/30",
      valueClass: criticalTasks > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground/40",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
        Execution Snapshot
      </span>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {cards.map((card, i) => (
          <SnapshotCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            iconClass={card.iconClass}
            valueClass={card.valueClass}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
