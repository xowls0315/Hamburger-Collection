"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, getMe, logout as apiLogout, refreshToken as apiRefreshToken, getKakaoLoginUrl, setAccessTokenGetter, setAccessTokenSetter, setRefreshTokenCallback } from "../../lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // AccessToken getter/setter를 api.ts에 등록
  useEffect(() => {
    setAccessTokenGetter(() => accessToken);
    setAccessTokenSetter((token: string | null) => setAccessToken(token));
    setRefreshTokenCallback(async () => {
      try {
        const result = await apiRefreshToken();
        setAccessToken(result.accessToken);
        return result.accessToken;
      } catch {
        setAccessToken(null);
        setUser(null);
        return null;
      }
    });
  }, [accessToken]);

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
        // 먼저 refreshToken으로 accessToken을 받아서 시도
        const result = await apiRefreshToken();
        setAccessToken(result.accessToken);
        const userData = await getMe();
        setUser(userData);
      } catch (error) {
        // refreshToken이 없거나 만료된 경우 - 로그인 필요
        // 에러를 무시하고 로그인하지 않은 상태로 처리
        setAccessToken(null);
        setUser(null);
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
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, setAccessToken }}>
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
