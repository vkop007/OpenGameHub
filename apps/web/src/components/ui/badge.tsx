import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "accent" | "outline";
}

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  neutral: "bg-white/[0.06] text-muted border-line",
  accent: "bg-accent-soft text-accent border-accent-line",
  outline: "bg-transparent text-muted border-line-strong"
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 h-6 text-xs font-medium leading-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
