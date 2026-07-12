import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "focus:ring-ring inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:ring-2 focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/80 border-transparent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent",
        destructive:
          "bg-destructive/15 text-destructive hover:bg-destructive/20 border-destructive/20",
        outline: "text-foreground border-border",
        // Priority-specific variants
        low: "bg-muted text-muted-foreground border-transparent",
        medium:
          "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        high: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        urgent:
          "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
