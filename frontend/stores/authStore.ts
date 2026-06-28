import { create } from "zustand";
import {
  User,
  getMe,
  getKakaoLoginUrl,
  loginLocal,
  logout as apiLogout,
  refreshToken as apiRefreshToken,
  setAccessTokenGetter,
  setAccessTokenSetter,
  setRefreshTokenCallback,
} from "../lib/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  setAccessToken: (token: string | null) => void;
  initAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
  login: () => void;
  loginWithCredentials: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

let initPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  loading: true,

  setAccessToken: (token) => set({ accessToken: token }),

  initAuth: async () => {
    if (initPromise) {
      await initPromise;
      return;
    }

    initPromise = (async () => {
      try {
        set({ loading: true });
        const result = await apiRefreshToken();
        set({ accessToken: result.accessToken });
        const userData = await getMe();
        set({ user: userData });
      } catch {
        set({ accessToken: null, user: null });
      } finally {
        set({ loading: false });
      }
    })();

    try {
      await initPromise;
    } finally {
      initPromise = null;
    }
  },

  refreshUser: async () => {
    try {
      const userData = await getMe();
      set({ user: userData });
    } catch {
      set({ user: null });
    }
  },

  login: () => {
    window.location.href = getKakaoLoginUrl();
  },

  loginWithCredentials: async (loginId, password) => {
    const result = await loginLocal(loginId, password);
    set({ accessToken: result.accessToken, user: result.user });
  },

  logout: async () => {
    try {
      await apiLogout();
    } finally {
      set({ accessToken: null, user: null });
    }
  },
}));

/** api.ts 토큰 연동 (한 번만 호출) */
export function setupAuthApiBridge() {
  setAccessTokenGetter(() => useAuthStore.getState().accessToken);
  setAccessTokenSetter((token) => useAuthStore.getState().setAccessToken(token));
  setRefreshTokenCallback(async () => {
    try {
      const result = await apiRefreshToken();
      useAuthStore.getState().setAccessToken(result.accessToken);
      return result.accessToken;
    } catch {
      useAuthStore.getState().setAccessToken(null);
      useAuthStore.setState({ user: null });
      return null;
    }
  });
}
