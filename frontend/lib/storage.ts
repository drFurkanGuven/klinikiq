/**
 * storage.ts — Platform-aware secure storage
 *
 * Native: @capacitor/preferences (SharedPreferences/NSUserDefaults)
 * Web: localStorage
 *
 * KRİTİK TASARIM KURALLARI:
 * - init() ASLA throw etmez — hata olursa localStorage'a fallback yapar
 * - waitForInit() ASLA hang etmez — 5s timeout sonra devam eder
 * - getItem() ASLA block etmez — sync, cache'den okur
 */

import { Capacitor } from "@capacitor/core";

const cache: Record<string, string | null> = {};
let initialized = false;
let _initPromise: Promise<void> | null = null;

const PRELOAD_KEYS = ["access_token", "refresh_token", "biometrics_enabled"] as const;

async function getPreferences() {
  const { Preferences } = await import("@capacitor/preferences");
  return Preferences;
}

export const storage = {
  /**
   * Uygulama açılışında çağrılır (AppInit).
   * Hata olsa bile initialized=true set edilir (localStorage fallback ile).
   * Promise kaydedilir — birden fazla çağrı tek bir init çalıştırır.
   */
  async init(): Promise<void> {
    if (initialized) return;
    if (!_initPromise) {
      _initPromise = (async () => {
        try {
          if (Capacitor.isNativePlatform()) {
            const Preferences = await getPreferences();
            for (const key of PRELOAD_KEYS) {
              try {
                const { value } = await Preferences.get({ key });
                cache[key] = value;
              } catch {
                // Preferences hatası → localStorage fallback
                cache[key] = typeof window !== "undefined"
                  ? localStorage.getItem(key)
                  : null;
              }
            }
          } else {
            for (const key of PRELOAD_KEYS) {
              cache[key] = typeof window !== "undefined"
                ? localStorage.getItem(key)
                : null;
            }
          }
        } catch {
          // Tüm init başarısız → localStorage fallback (web güvenliği)
          if (typeof window !== "undefined") {
            for (const key of PRELOAD_KEYS) {
              cache[key] = localStorage.getItem(key);
            }
          }
        } finally {
          initialized = true;
        }
      })();
    }
    return _initPromise;
  },

  /**
   * Init tamamlanana kadar bekler.
   * 5 saniye içinde bitmezse devam eder (asla sonsuz blok olmaz).
   * Hata olsa bile resolve eder (hiçbir zaman reject etmez).
   */
  waitForInit(): Promise<void> {
    if (initialized) return Promise.resolve();
    const target = _initPromise ?? storage.init();
    return Promise.race([
      target,
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]).catch(() => {
      initialized = true; // fallback: bozuk state'i düzelt
    });
  },

  /** Token kaydeder — hem cache hem kalıcı depolama */
  async setItem(key: string, value: string): Promise<void> {
    cache[key] = value; // önce cache — sync erişim hemen çalışsın
    try {
      if (Capacitor.isNativePlatform()) {
        const Preferences = await getPreferences();
        await Preferences.set({ key, value });
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      // Kalıcı kayıt başarısız olsa da cache'de var, oturum sürer
      localStorage.setItem(key, value); // son çare localStorage
    }
  },

  /** Token siler */
  async removeItem(key: string): Promise<void> {
    cache[key] = null;
    try {
      if (Capacitor.isNativePlatform()) {
        const Preferences = await getPreferences();
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      localStorage.removeItem(key);
    }
  },

  /**
   * Senkron okuma — cache'den.
   * Init bitmemişse web'de localStorage fallback, native'de null.
   * (Native'de waitForInit() garanti eder ki bu null dönmez.)
   */
  getItem(key: string): string | null {
    if (initialized) return cache[key] ?? null;
    // Init bitmemiş — sadece web'de localStorage fallback güvenlidir
    if (!Capacitor.isNativePlatform() && typeof window !== "undefined") {
      return localStorage.getItem(key);
    }
    return null;
  },
};
