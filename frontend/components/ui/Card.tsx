import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padded?: boolean;
}

export function Card({ hover = false, padded = true, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-lg",
        padded && "p-5",
        hover && "card-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
