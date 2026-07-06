"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

/** @deprecated Palette selection removed in design v2; kept for type compatibility. */
export type Palette = "emerald" | "midnight" | "violet" | "rose";
type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  palette: Palette;
  toggleTheme: () => void;
  setPalette: (p: Palette) => void;
}>({
  theme: "light",
  palette: "emerald",
  toggleTheme: () => {},
  setPalette: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("klinikiq-theme") as Theme | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    document.documentElement.removeAttribute("data-palette");
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("klinikiq-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  };

  /** No-op — single teal accent in CSS; UI may still call this until removed. */
  const setPalette = (_p: Palette) => {};

  return (
    <ThemeContext.Provider
      value={{ theme, palette: "emerald", toggleTheme, setPalette }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
