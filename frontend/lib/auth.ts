import api from "./api";
import { storage } from "./storage";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  school?: string;
  year?: number;
}

export async function login(
  email: string,
  password: string,
  options?: { rememberMe?: boolean }
): Promise<void> {
  const res = await api.post("/auth/login", { email, password });
  const persistent = options?.rememberMe ?? true;
  await storage.setAuthTokens(res.data.access_token, res.data.refresh_token, persistent);
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
  school?: string;
  year?: number;
}): Promise<void> {
  const res = await api.post("/auth/register", data);
  await storage.setAuthTokens(res.data.access_token, res.data.refresh_token, true);
}

export async function logout(): Promise<void> {
  await storage.clearAuthTokens();
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}
