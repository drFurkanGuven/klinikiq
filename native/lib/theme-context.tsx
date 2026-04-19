import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";
import { darkTheme, lightTheme, type Theme } from "./theme";

const STORAGE_KEY = "@klinikiq/theme_mode";

export type ThemeMode = "system" | "light" | "dark";

type Ctx = {
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  resolvedScheme: "light" | "dark";
};

const ThemeCtx = createContext<Ctx | null>(null);

function resolveScheme(mode: ThemeMode, system: ColorSchemeName): "light" | "dark" {
  if (mode === "system") {
    return system === "dark" ? "dark" : "light";
  }
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setModeState(v);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    SecureStore.setItemAsync(STORAGE_KEY, m).catch(() => {});
  }, []);

  const resolvedScheme = resolveScheme(mode, systemScheme);

  const theme = useMemo(
    () => (resolvedScheme === "dark" ? darkTheme : lightTheme),
    [resolvedScheme]
  );

  const value = useMemo(
    () => ({ theme, mode, setMode, resolvedScheme }),
    [theme, mode, setMode, resolvedScheme]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    const scheme = Appearance.getColorScheme() === "dark" ? "dark" : "light";
    return scheme === "dark" ? darkTheme : lightTheme;
  }
  return ctx.theme;
}

export function useThemeMode(): Pick<Ctx, "mode" | "setMode" | "resolvedScheme"> {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    return {
      mode: "system",
      setMode: () => {},
      resolvedScheme:
        Appearance.getColorScheme() === "dark" ? "dark" : "light",
    };
  }
  return { mode: ctx.mode, setMode: ctx.setMode, resolvedScheme: ctx.resolvedScheme };
}
