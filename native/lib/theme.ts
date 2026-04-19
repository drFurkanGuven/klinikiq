export const darkTheme = {
  bg: "#0A0F1E",
  surface: "#111827",
  card: "#1C2537",
  border: "rgba(255,255,255,0.08)",
  accent: "#818CF8",
  accentDark: "#6366F1",
  text: "#F1F5F9",
  textMuted: "#64748B",
  success: "#34D399",
  error: "#F87171",
  gradient: ["#818CF8", "#6366F1"] as const,
};

export const lightTheme = {
  bg: "#F0F4FF",
  surface: "#FFFFFF",
  card: "#E8EDF8",
  border: "#CBD5E1",
  accent: "#6366F1",
  accentDark: "#4F46E5",
  text: "#0F172A",
  textMuted: "#64748B",
  success: "#059669",
  error: "#DC2626",
  gradient: ["#6366F1", "#4F46E5"] as const,
};

export type Theme = typeof darkTheme | typeof lightTheme;

export { ThemeProvider, useTheme, useThemeMode } from "./theme-context";
