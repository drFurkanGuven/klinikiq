"use client";
import { useEffect } from "react";
import { storage } from "@/lib/storage";

/**
 * Uygulama açılışında storage önbelleğini yükler.
 * layout.tsx içinde ThemeProvider'ın hemen içine eklenir.
 */
export function AppInit() {
  useEffect(() => {
    storage.init();
  }, []);
  return null;
}
