"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, getMe, logout as apiLogout, refreshToken, getKakaoLoginUrl } from "../lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getMe();
      setUser(userData);
    } catch {
      setUser(null);
    }
  }, []);

  // 초기 로딩 시 사용자 정보 확인
  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await getMe();
        setUser(userData);
      } catch {
        // 인증되지 않은 상태 - 토큰 갱신 시도
        try {
          await refreshToken();
          const userData = await getMe();
          setUser(userData);
        } catch {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = () => {
    window.location.href = getKakaoLoginUrl();
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
