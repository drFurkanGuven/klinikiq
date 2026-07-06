"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  rightSlot?: ReactNode;
}

const inputBase =
  "w-full rounded-md border border-border-strong bg-surface text-foreground text-sm px-3.5 py-2.5 transition-all placeholder:text-muted focus:outline-none focus:border-foreground focus:shadow-[0_0_0_1px_var(--foreground)]";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, rightSlot, className, id, ...props },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
          {label}
        </label>
      )}
      <div className="relative">
        <input ref={ref} id={id} className={cn(inputBase, rightSlot && "pr-11", className)} {...props} />
        {rightSlot && <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">{rightSlot}</div>}
      </div>
      {hint && (
        <p className="text-xs mt-1.5" style={{ color: "var(--muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
});
