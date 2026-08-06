import * as React from "react";
import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  outline: "border text-foreground",
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100 border-emerald-200",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 border-amber-200",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-blue-200",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
