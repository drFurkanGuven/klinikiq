import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
          {title}
        </h2>
        {description && (
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
