/**
 * storage.ts — Platform-aware secure storage
 *
 * Native: @capacitor/preferences (SharedPreferences/NSUserDefaults)
 * Web: localStorage
 */

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const cache: Record<string, string | null> = {};
let initialized = false;
let _initPromise: Promise<void> | null = null;

const PRELOAD_KEYS = ["access_token", "refresh_token", "biometrics_enabled"] as const;

export const storage = {
  async init(): Promise<void> {
    if (initialized) return;
    if (!_initPromise) {
      _initPromise = (async () => {
        try {
          if (Capacitor.isNativePlatform()) {
            for (const key of PRELOAD_KEYS) {
              try {
                const { value } = await Preferences.get({ key });
                cache[key] = value;
              } catch {
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

  waitForInit(): Promise<void> {
    if (initialized) return Promise.resolve();
    const target = _initPromise ?? storage.init();
    return Promise.race([
      target,
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]).catch(() => {
      initialized = true;
    });
  },

  async setItem(key: string, value: string): Promise<void> {
    cache[key] = value;
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key, value });
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      try { localStorage.setItem(key, value); } catch {}
    }
  },

  async removeItem(key: string): Promise<void> {
    cache[key] = null;
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      try { localStorage.removeItem(key); } catch {}
    }
  },

  getItem(key: string): string | null {
    if (initialized) return cache[key] ?? null;
    if (!Capacitor.isNativePlatform() && typeof window !== "undefined") {
      return localStorage.getItem(key);
    }
    return null;
  },
};
