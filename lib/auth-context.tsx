"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, ApiError, type ApiFetchOptions } from "./api";
import type { MemberResponse, TokenResponse } from "./types";

type AuthContextValue = {
  accessToken: string | null;
  member: MemberResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  updateNickname: (nickname: string) => Promise<void>;
  fetchWithAuth: <T>(path: string, options?: ApiFetchOptions) => Promise<T>;
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

  // access token 만료(401) 시 refreshToken 쿠키로 한 번 갱신을 시도하고, 성공하면
  // 원 요청을 새 토큰으로 한 번만 재시도한다. refresh도 실패하면(쿠키 만료/탈취 탐지 등)
  // 원래 401 에러를 그대로 던져 무한 재시도를 막는다.
  const fetchWithAuth = useCallback(
    async <T,>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
      try {
        return await apiFetch<T>(path, { ...options, accessToken });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const newToken = await refresh();
          if (newToken) {
            return await apiFetch<T>(path, { ...options, accessToken: newToken });
          }
        }
        throw err;
      }
    },
    [accessToken, refresh],
  );

  const updateNickname = useCallback(
    async (nickname: string) => {
      const updated = await fetchWithAuth<MemberResponse>("/api/members/me/nickname", {
        method: "PATCH",
        body: { nickname },
      });
      setMember(updated);
    },
    [fetchWithAuth],
  );

  return (
    <AuthContext.Provider
      value={{ accessToken, member, isLoading, login, logout, refresh, updateNickname, fetchWithAuth }}
    >
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
