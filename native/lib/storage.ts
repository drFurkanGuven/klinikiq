import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

const memory = new Map<string, string>();

let initPromise: Promise<void> | null = null;
let initialized = false;

function resolveInit(): void {
  initialized = true;
}

export const storage = {
  waitForInit(): Promise<void> {
    if (initialized) return Promise.resolve();
    if (!initPromise) {
      initPromise = Promise.resolve().then(resolveInit);
    }
    return Promise.race([
      initPromise,
      new Promise<void>((r) => setTimeout(r, 5000)),
    ]).catch(() => {
      resolveInit();
    });
  },

  async getToken(): Promise<string | null> {
    const mem = memory.get(ACCESS_KEY);
    if (mem) return mem;
    try {
      return await SecureStore.getItemAsync(ACCESS_KEY);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    const mem = memory.get(REFRESH_KEY);
    if (mem) return mem;
    try {
      return await SecureStore.getItemAsync(REFRESH_KEY);
    } catch {
      return null;
    }
  },

  async setToken(value: string, persistent: boolean): Promise<void> {
    memory.delete(ACCESS_KEY);
    try {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
    } catch {
      /* ignore */
    }
    if (persistent) {
      await SecureStore.setItemAsync(ACCESS_KEY, value);
    } else {
      memory.set(ACCESS_KEY, value);
    }
  },

  async setRefreshToken(value: string, persistent: boolean): Promise<void> {
    memory.delete(REFRESH_KEY);
    try {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } catch {
      /* ignore */
    }
    if (persistent) {
      await SecureStore.setItemAsync(REFRESH_KEY, value);
    } else {
      memory.set(REFRESH_KEY, value);
    }
  },

  async setTokens(
    access: string,
    refresh: string,
    persistent: boolean
  ): Promise<void> {
    await this.setToken(access, persistent);
    await this.setRefreshToken(refresh, persistent);
  },

  async removeToken(): Promise<void> {
    memory.delete(ACCESS_KEY);
    memory.delete(REFRESH_KEY);
    try {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
    } catch {
      /* ignore */
    }
    try {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } catch {
      /* ignore */
    }
  },

  async isAuthenticated(): Promise<boolean> {
    return !!(await this.getToken());
  },
};
