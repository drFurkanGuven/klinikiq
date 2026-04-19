import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { authApi, type UserOut } from "./api";
import { queryClient } from "./query-client";
import { storage } from "./storage";

export async function login(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<void> {
  const res = await authApi.login(email, password);
  await storage.setTokens(
    res.data.access_token,
    res.data.refresh_token,
    rememberMe
  );
}

export async function logout(): Promise<void> {
  await storage.removeToken();
  queryClient.clear();
  router.replace("/(auth)/login");
}

export function useAuth(): {
  user: UserOut | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetchUser: () => void;
} {
  const queryClient = useQueryClient();
  const [gate, setGate] = useState<"init" | "in" | "out">("init");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await storage.waitForInit();
      const ok = await storage.isAuthenticated();
      if (!cancelled) setGate(ok ? "in" : "out");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => (await authApi.me()).data,
    enabled: gate === "in",
    staleTime: 60_000,
  });

  const refetchUser = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  }, [queryClient]);

  return {
    user,
    isLoading: gate === "init" || (gate === "in" && isLoading),
    isAuthenticated: gate === "in",
    refetchUser,
  };
}
