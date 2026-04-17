"use client";
import { useEffect } from "react";
import { storage } from "@/lib/storage";
import { Capacitor } from "@capacitor/core";

/**
 * Uygulama açılışında storage önbelleğini yükler.
 * layout.tsx içinde ThemeProvider'ın hemen içine eklenir.
 */
export function AppInit() {
  useEffect(() => {
    storage.init();
    if (typeof document !== "undefined") {
      if (Capacitor.isNativePlatform()) {
        document.documentElement.setAttribute("data-native-platform", "true");
      } else {
        document.documentElement.removeAttribute("data-native-platform");
      }
    }
  }, []);
  return null;
}
