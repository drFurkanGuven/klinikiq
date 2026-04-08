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
    return <div className="w-9 h-9 rounded-xl animate-pulse" style={{ background: "var(--surface-2)" }} />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
      aria-label="Temayı Değiştir"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" style={{ color: "var(--warning)" }} />
      ) : (
        <Moon className="h-4 w-4" style={{ color: "var(--primary)" }} />
      )}
    </button>
  );
}
