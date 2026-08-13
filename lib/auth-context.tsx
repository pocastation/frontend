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
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, apiFetchBlob, apiFetchMultipart, ApiError, type ApiFetchOptions } from "./api";
import type { MemberResponse, TokenResponse } from "./types";

type AuthContextValue = {
  accessToken: string | null;
  member: MemberResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
  updateNickname: (nickname: string) => Promise<void>;
  // 소셜 가입자 온보딩(#217) — 닉네임 확정 + 약관·처리방침 동의 + 만 14세 확인을 한 번에 보낸다.
  completeOnboarding: (payload: OnboardingPayload) => Promise<void>;
  // 재동의(#219, BE #198) — 동의 기록이 없는 기존 회원이 동의만 다시 낸다(닉네임은 건드리지 않는다).
  recordConsents: (payload: ConsentPayload) => Promise<void>;
  withdraw: () => Promise<void>;
  fetchWithAuth: <T>(path: string, options?: ApiFetchOptions) => Promise<T>;
  fetchMultipartWithAuth: <T>(path: string, formData: FormData) => Promise<T>;
  fetchBlobWithAuth: (path: string) => Promise<Blob>;
};

// 온보딩 전송 형태 — BE OnboardingRequest(#183)와 1:1.
export type OnboardingPayload = {
  nickname: string;
  termsAgreed: boolean;
  personalInfoAgreed: boolean;
  ageOver14Confirmed: boolean;
  marketingAgreed: boolean;
};

// 재동의 전송 형태 — BE ConsentRequest(#198)와 1:1. 온보딩과 달리 닉네임이 없다.
export type ConsentPayload = Omit<OnboardingPayload, "nickname">;

// 동의 게이트(BE #198)가 쓰기 요청을 막을 때 내려주는 코드. 이 코드를 보면 재동의 화면으로 보낸다.
export const SERVICE_CONSENT_REQUIRED = "SERVICE_CONSENT_REQUIRED";

// 이메일 인증 전 로그인 차단(BE #224). 자격증명은 맞았고 남은 관문이 인증뿐이라는 뜻이라
// 401이 아니라 403으로 온다 — 로그인 화면이 이 코드를 보고 재발송 UI를 띄운다.
export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";

// 재동의 화면 경로. 동의를 마치면 원래 있던 화면으로 돌려보내기 위해 현재 경로를 붙인다.
export const CONSENT_PATH = "/onboarding/consents";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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

  // 동의 게이트(BE #198)에 막히면 재동의 화면으로 보낸다.
  //
  // 프론트가 스스로 "동의 안 했으니 막자"고 판단하지 않고 **서버가 403을 줄 때만** 반응한다.
  // 그래야 서버 플래그(app.consent.enforce)를 켜고 끄는 것만으로 동작이 따라오고,
  // 프론트에 별도 스위치를 둬서 두 상태가 어긋나는 일이 없다.
  //
  // 에러는 삼키지 않고 그대로 던진다 — 호출측이 로딩 상태를 정리해야 하고,
  // 라우팅이 끝나기 전에 화면이 성공한 것처럼 보이면 안 된다.
  const redirectOnConsentRequired = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.errorCode === SERVICE_CONSENT_REQUIRED) {
        // 이미 재동의 화면이면 다시 밀어 넣지 않는다(뒤로가기 히스토리 오염 방지).
        if (pathname !== CONSENT_PATH) {
          router.push(`${CONSENT_PATH}?next=${encodeURIComponent(pathname ?? "/")}`);
        }
      }
    },
    [pathname, router],
  );

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
        redirectOnConsentRequired(err);
        throw err;
      }
    },
    [accessToken, refresh, redirectOnConsentRequired],
  );

  const fetchMultipartWithAuth = useCallback(
    async <T,>(path: string, formData: FormData): Promise<T> => {
      try {
        return await apiFetchMultipart<T>(path, formData, accessToken);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const newToken = await refresh();
          if (newToken) {
            return await apiFetchMultipart<T>(path, formData, newToken);
          }
        }
        redirectOnConsentRequired(err);
        throw err;
      }
    },
    [accessToken, refresh, redirectOnConsentRequired],
  );

  const fetchBlobWithAuth = useCallback(
    async (path: string): Promise<Blob> => {
      try {
        return await apiFetchBlob(path, accessToken);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const newToken = await refresh();
          if (newToken) {
            return await apiFetchBlob(path, newToken);
          }
        }
        redirectOnConsentRequired(err);
        throw err;
      }
    },
    [accessToken, refresh, redirectOnConsentRequired],
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

  const completeOnboarding = useCallback(
    async (payload: OnboardingPayload) => {
      await fetchWithAuth<MemberResponse>("/api/members/me/onboarding", {
        method: "POST",
        body: payload,
      });
      // 닉네임 변경과 같은 이유로 /me를 다시 읽어 통째로 교체한다(보강 필드·잠금 시각 반영).
      const me = await fetchWithAuth<MemberResponse>("/api/members/me");
      setMember(me);
    },
    [fetchWithAuth],
  );

  // 재동의(#219) — 기존 회원이 동의만 다시 낸다. 온보딩과 달리 닉네임을 보내지 않는다:
  // 대상은 닉네임이 이미 확정된 회원이라, 여기서 닉네임을 다시 받으면 중복·변경제한 규칙까지 얽힌다.
  const recordConsents = useCallback(
    async (payload: ConsentPayload) => {
      await fetchWithAuth<{ consented: boolean }>("/api/members/me/consents", {
        method: "POST",
        body: payload,
      });
    },
    [fetchWithAuth],
  );

  const withdraw = useCallback(async () => {
    // 서버가 프로필을 가명화하고 리프레시 토큰을 폐기한다(backend #120). 진행 중 거래가 있으면
    // 409를 던져 호출측(SettingsTab)이 사유를 표시한다.
    await fetchWithAuth<void>("/api/members/me", { method: "DELETE" });
    // 세션 쿠키는 서버만 지울 수 있어 로그아웃을 best-effort로 호출(토큰은 이미 폐기됨)한 뒤
    // 클라 상태를 정리한다.
    try {
      await apiFetch<void>("/api/auth/logout", { method: "POST" });
    } catch {
      // 리프레시 토큰이 이미 없어 실패해도 무방 — 상태만 정리하면 로그아웃된 것과 동일.
    }
    setAccessToken(null);
    setMember(null);
  }, [fetchWithAuth]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        member,
        isLoading,
        login,
        logout,
        refresh,
        updateNickname,
        completeOnboarding,
        recordConsents,
        withdraw,
        fetchWithAuth,
        fetchMultipartWithAuth,
        fetchBlobWithAuth,
      }}
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
