"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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

  // 동시에 여러 요청이 401을 맞아도 refresh는 실제로 한 번만 나가야 한다 — 백엔드가
  // 리프레시 토큰 회전에 락을 걸어 두 번째 동시 refresh는 거부하므로(pocastation/backend#21),
  // 각자 독립적으로 refresh를 호출하면 세션이 멀쩡해도 한쪽은 실패로 보인다. 진행 중인
  // refresh promise를 공유해서 그 결과를 함께 기다린다.
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const refresh = useCallback((): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const tokens = await apiFetch<TokenResponse>("/api/auth/refresh", { method: "POST" });
        setAccessToken(tokens.accessToken);
        await fetchMe(tokens.accessToken);
        return tokens.accessToken;
      } catch {
        setAccessToken(null);
        setMember(null);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [fetchMe]);

  // 새로고침 시 refreshToken 쿠키로 세션 복구를 시도한다. 쿠키가 없으면(비로그인)
  // refresh()가 조용히 null을 반환하므로 별도 에러 처리는 불필요.
  useEffect(() => {
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
      await fetchWithAuth<MemberResponse>("/api/members/me/nickname", {
        method: "PATCH",
        body: { nickname },
      });
      // 변경 성공 후 /me를 다시 읽는다 — PATCH 응답엔 보강 필드(provider·createdAt)뿐 아니라
      // 갱신된 nicknameChangeableAt(#118 잠금 시각)도 없어서, 통째로 최신 프로필로 교체한다.
      const me = await fetchWithAuth<MemberResponse>("/api/members/me");
      setMember(me);
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
