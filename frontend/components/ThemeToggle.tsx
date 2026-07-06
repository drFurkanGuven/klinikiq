"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-8 h-8 rounded-md animate-pulse"
        style={{ background: "var(--surface-muted)" }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-surface-muted"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      aria-label="Temayı değiştir"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" style={{ color: "var(--muted)" }} />
      ) : (
        <Moon className="h-4 w-4" style={{ color: "var(--muted)" }} />
      )}
    </button>
  );
}
