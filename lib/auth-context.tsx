"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "./api";
import type { MemberResponse, TokenResponse } from "./types";

type AuthContextValue = {
  accessToken: string | null;
  member: MemberResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (token: string) => {
    const me = await apiFetch<MemberResponse>("/api/members/me", { accessToken: token });
    setMember(me);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const tokens = await apiFetch<TokenResponse>("/api/auth/refresh", { method: "POST" });
      setAccessToken(tokens.accessToken);
      await fetchMe(tokens.accessToken);
      return tokens.accessToken;
    } catch {
      setAccessToken(null);
      setMember(null);
      return null;
    }
  }, [fetchMe]);

  // 새로고침 시 refreshToken 쿠키로 세션 복구를 시도한다. 쿠키가 없으면(비로그인)
  // refresh()가 조용히 null을 반환하므로 별도 에러 처리는 불필요.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 세션 복구용 비동기 초기화
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await apiFetch<TokenResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setAccessToken(tokens.accessToken);
      await fetchMe(tokens.accessToken);
    },
    [fetchMe],
  );

  const logout = useCallback(async () => {
    await apiFetch<void>("/api/auth/logout", { method: "POST" });
    setAccessToken(null);
    setMember(null);
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, member, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
