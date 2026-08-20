import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { getAuthState, logoutDeriv } from "@/lib/auth.functions";
import type { AuthState } from "@/lib/deriv-types";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export const authStateQueryKey = ["kocel", "auth-state"] as const;

/** Single source of truth for session + Deriv connection state. */
export function useDerivSession() {
  const fetchAuthState = useServerFn(getAuthState);
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const query = useQuery<AuthState>({
    queryKey: authStateQueryKey,
    queryFn: () => fetchAuthState({ data: undefined }),
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
    staleTime: 5_000,
  });

  let status: ConnectionStatus = "connecting";
  if (!online) status = "disconnected";
  else if (query.isError && !query.isFetching) status = "disconnected";
  else if (query.isError || (query.failureCount > 0 && query.isFetching)) status = "reconnecting";
  else if (query.isSuccess && query.data.authenticated) status = "connected";
  else if (query.isSuccess) status = "disconnected";

  return {
    status,
    reconnectAttempt: query.failureCount,
    authState: query.data ?? null,
    account: query.data?.account ?? null,
    isLoading: query.isPending,
    isError: query.isError,
    refresh: () => queryClient.invalidateQueries({ queryKey: authStateQueryKey }),
  };
}

export function useDerivLogout() {
  const logout = useServerFn(logoutDeriv);
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.cancelQueries();
    try {
      await logout({ data: undefined });
    } finally {
      queryClient.clear();
    }
  };
}
