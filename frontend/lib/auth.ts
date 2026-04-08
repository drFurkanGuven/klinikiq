import api from "./api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  school?: string;
  year?: number;
}

export async function login(
  email: string,
  password: string
): Promise<void> {
  const res = await api.post("/auth/login", { email, password });
  localStorage.setItem("access_token", res.data.access_token);
  localStorage.setItem("refresh_token", res.data.refresh_token);
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
  school?: string;
  year?: number;
}): Promise<void> {
  const res = await api.post("/auth/register", data);
  localStorage.setItem("access_token", res.data.access_token);
  localStorage.setItem("refresh_token", res.data.refresh_token);
}

export function logout(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("access_token");
}
