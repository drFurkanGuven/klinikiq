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
let _initPromise: Promise<void> | null = null;

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
   * Promise kaydedilir — birden fazla çağrı sadece bir kez çalışır.
   */
  async init(): Promise<void> {
    if (initialized) return;
    if (!_initPromise) {
      _initPromise = (async () => {
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
      })();
    }
    return _initPromise;
  },

  /**
   * Init tamamlanana kadar bekler.
   * API interceptor'da kullanılır — her istek öncesi storage garantili hazır olur.
   */
  waitForInit(): Promise<void> {
    if (initialized) return Promise.resolve();
    if (_initPromise) return _initPromise;
    return storage.init(); // henüz başlamadıysa başlat
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
   * init() çağrılmadan önce web'de localStorage'a fallback yapar,
   * native'de null döner (waitForInit() garanti eder ki bu olmaz).
   */
  getItem(key: string): string | null {
    if (initialized) return cache[key] ?? null;
    // Native'de init bitmeden token yok — waitForInit() bunu önler
    if (Capacitor.isNativePlatform()) return null;
    // Web'de localStorage'a fallback (sadece geliştirme/SSR)
    if (typeof window !== "undefined") return localStorage.getItem(key);
    return null;
  },
};
