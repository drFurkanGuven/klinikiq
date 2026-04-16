import api from "./api";
import { storage } from "./storage";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  school?: string;
  year?: number;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await api.post("/auth/login", { email, password });
  await storage.setItem("access_token", res.data.access_token);
  await storage.setItem("refresh_token", res.data.refresh_token);
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
  school?: string;
  year?: number;
}): Promise<void> {
  const res = await api.post("/auth/register", data);
  await storage.setItem("access_token", res.data.access_token);
  await storage.setItem("refresh_token", res.data.refresh_token);
}

export async function logout(): Promise<void> {
  await storage.removeItem("access_token");
  await storage.removeItem("refresh_token");
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!storage.getItem("access_token");
}
