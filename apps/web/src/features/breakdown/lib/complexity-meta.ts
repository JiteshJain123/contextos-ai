import type { TaskComplexity } from "@contextos-ai/validators/task";

export interface ComplexityMeta {
  label: string;
  hours: string;
  color: string;
  bg: string;
}

export const COMPLEXITY_META: Record<TaskComplexity, ComplexityMeta> = {
  XS: { label: "XS", hours: "< 1h", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
  S: { label: "S", hours: "1–2h", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  M: { label: "M", hours: "3–5h", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
  L: { label: "L", hours: "6–10h", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40" },
  XL: { label: "XL", hours: "11–16h", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40" },
};
