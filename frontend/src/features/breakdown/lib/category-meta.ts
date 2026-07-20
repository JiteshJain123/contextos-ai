import type { TaskCategory } from "@/lib/validators/task";

export interface CategoryMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}

export const CATEGORY_META: Record<TaskCategory, CategoryMeta> = {
  frontend: {
    label: "Frontend",
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800",
    icon: "Monitor",
  },
  backend: {
    label: "Backend",
    color: "text-sky-700 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800",
    icon: "Server",
  },
  database: {
    label: "Database",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    icon: "Database",
  },
  testing: {
    label: "Testing",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-200 dark:border-green-800",
    icon: "TestTube",
  },
  deployment: {
    label: "Deployment",
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
    icon: "Rocket",
  },
};

export const ALL_CATEGORIES: TaskCategory[] = [
  "frontend",
  "backend",
  "database",
  "testing",
  "deployment",
];
