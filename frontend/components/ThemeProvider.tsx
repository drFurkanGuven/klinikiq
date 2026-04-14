"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Palette = "emerald" | "midnight" | "violet" | "rose";
type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  palette: Palette;
  toggleTheme: () => void;
  setPalette: (p: Palette) => void;
}>({ 
  theme: "dark", 
  palette: "emerald", 
  toggleTheme: () => {}, 
  setPalette: () => {} 
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [palette, setPaletteState] = useState<Palette>("emerald");

  useEffect(() => {
    // Theme loading
    const savedTheme = localStorage.getItem("klinikiq-theme") as Theme | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    // Palette loading
    const savedPalette = localStorage.getItem("klinikiq-palette") as Palette | null;
    const initialPalette = savedPalette || "emerald";
    setPaletteState(initialPalette);
    document.documentElement.setAttribute("data-palette", initialPalette);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("klinikiq-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  };

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    localStorage.setItem("klinikiq-palette", p);
    document.documentElement.setAttribute("data-palette", p);
  };

  return (
    <ThemeContext.Provider value={{ theme, palette, toggleTheme, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}
