"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import { clearUserQueries } from "./queries/clearUserQueries";

export function useAuth() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const login = useAuthStore((s) => s.login);
  const loginWithCredentials = useAuthStore((s) => s.loginWithCredentials);
  const storeLogout = useAuthStore((s) => s.logout);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  const logout = useCallback(async () => {
    await storeLogout();
    clearUserQueries(queryClient);
  }, [storeLogout, queryClient]);

  return {
    user,
    loading,
    login,
    loginWithCredentials,
    logout,
    refreshUser,
    setAccessToken,
  };
}

/** @deprecated AuthProvider 대신 QueryProvider 사용 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement;
}
