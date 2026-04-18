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
              cache[key] =
                typeof window !== "undefined"
                  ? localStorage.getItem(key) ??
                    (key === "access_token" || key === "refresh_token"
                      ? sessionStorage.getItem(key)
                      : null)
                  : null;
            }
          }
        } catch {
          if (typeof window !== "undefined") {
            for (const key of PRELOAD_KEYS) {
              cache[key] =
                localStorage.getItem(key) ??
                (key === "access_token" || key === "refresh_token"
                  ? sessionStorage.getItem(key)
                  : null);
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

  async setAuthTokens(accessToken: string, refreshToken: string, persistent: boolean): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: "access_token", value: accessToken });
      await Preferences.set({ key: "refresh_token", value: refreshToken });
      cache["access_token"] = accessToken;
      cache["refresh_token"] = refreshToken;
      return;
    }
    if (typeof window === "undefined") return;
    if (persistent) {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      localStorage.removeItem("session_only_auth");
    } else {
      sessionStorage.setItem("access_token", accessToken);
      sessionStorage.setItem("refresh_token", refreshToken);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.setItem("session_only_auth", "1");
    }
    cache["access_token"] = accessToken;
    cache["refresh_token"] = refreshToken;
  },

  async clearAuthTokens(): Promise<void> {
    cache["access_token"] = null;
    cache["refresh_token"] = null;
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key: "access_token" });
        await Preferences.remove({ key: "refresh_token" });
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        localStorage.removeItem("session_only_auth");
      }
    } catch {
      /* ignore */
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    cache[key] = value;
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key, value });
      } else if (typeof window !== "undefined") {
        if (key === "access_token") {
          if (localStorage.getItem("session_only_auth") === "1") {
            sessionStorage.setItem("access_token", value);
            return;
          }
          localStorage.setItem("access_token", value);
          return;
        }
        if (key === "refresh_token") {
          if (localStorage.getItem("session_only_auth") === "1") {
            sessionStorage.setItem("refresh_token", value);
            return;
          }
          localStorage.setItem("refresh_token", value);
          return;
        }
        localStorage.setItem(key, value);
      }
    } catch {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    cache[key] = null;
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key });
      } else if (typeof window !== "undefined") {
        localStorage.removeItem(key);
        if (key === "access_token" || key === "refresh_token") {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  },

  getItem(key: string): string | null {
    if (key === "access_token" || key === "refresh_token") {
      if (!Capacitor.isNativePlatform() && typeof window !== "undefined") {
        if (initialized) return cache[key] ?? null;
        return localStorage.getItem(key) ?? sessionStorage.getItem(key) ?? null;
      }
    }
    if (initialized) return cache[key] ?? null;
    if (!Capacitor.isNativePlatform() && typeof window !== "undefined") {
      return localStorage.getItem(key);
    }
    return null;
  },
};
