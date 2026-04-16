/**
 * storage.ts — Platform-aware secure storage
 *
 * Native (iOS/Android): @capacitor/preferences
 *   - iOS: NSUserDefaults (uygulama izole, sistem şifreli)
 *   - Android: SharedPreferences (uygulama izole)
 *
 * Web: localStorage (geliştirme için)
 *
 * Kullanım:
 *   await storage.setItem("key", "value")
 *   storage.getItem("key")   ← sync, memory cache'den okur
 *   await storage.removeItem("key")
 */

import { Capacitor } from "@capacitor/core";

// Uygulama başlangıcında yüklenen tokenlar için bellek içi önbellek
const cache: Record<string, string | null> = {};
let initialized = false;

// Hangi key'ler uygulama açılışında yüklenmeli
const PRELOAD_KEYS = ["access_token", "refresh_token", "biometrics_enabled"] as const;

async function getPreferences() {
  const { Preferences } = await import("@capacitor/preferences");
  return Preferences;
}

export const storage = {
  /**
   * Uygulama açılışında çağrılır (AppInit component'ı yapar).
   * Native platformda Preferences'dan cache'e yükler.
   */
  async init() {
    if (initialized) return;
    if (Capacitor.isNativePlatform()) {
      const Preferences = await getPreferences();
      for (const key of PRELOAD_KEYS) {
        const { value } = await Preferences.get({ key });
        cache[key] = value;
      }
    } else {
      for (const key of PRELOAD_KEYS) {
        cache[key] = localStorage.getItem(key);
      }
    }
    initialized = true;
  },

  /** Token kaydeder — hem cache hem kalıcı depolama */
  async setItem(key: string, value: string): Promise<void> {
    cache[key] = value;
    if (Capacitor.isNativePlatform()) {
      const Preferences = await getPreferences();
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  /** Token siler */
  async removeItem(key: string): Promise<void> {
    cache[key] = null;
    if (Capacitor.isNativePlatform()) {
      const Preferences = await getPreferences();
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  /**
   * Senkron okuma — init() sonrası cache'den döner.
   * init() çağrılmadan önce web'de localStorage'a fallback yapar.
   */
  getItem(key: string): string | null {
    if (initialized) return cache[key] ?? null;
    // init() henüz bitmemişse (web'de) localStorage'a fallback
    if (typeof window !== "undefined") return localStorage.getItem(key);
    return null;
  },
};
