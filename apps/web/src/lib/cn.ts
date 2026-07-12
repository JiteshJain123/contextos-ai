import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose className strings; merge conflicting Tailwind classes intelligently.
 *
 * `clsx` resolves conditionals and falsy values; `twMerge` resolves Tailwind
 * conflicts (e.g. `cn("p-2", "p-4")` → "p-4", not "p-2 p-4").
 *
 * This is the canonical ShadCN helper. Every component imports `cn` from here.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
