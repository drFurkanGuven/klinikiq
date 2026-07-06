import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "outline" | "success" | "warning" | "destructive";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  neutral: "bg-surface-hover text-foreground border border-transparent",
  outline: "bg-transparent text-muted border border-border-strong",
  success: "bg-[var(--success-muted)] text-success border border-transparent",
  warning: "bg-[var(--warning-muted)] text-warning border border-transparent",
  destructive: "bg-[var(--destructive-muted)] text-destructive border border-transparent",
};

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
