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
  // 탈퇴가 성공해 로그인 상태가 풀리는 중(#567). 마이페이지 가드가 이 동안은 로그인으로 보내지 않는다.
  isWithdrawing: boolean;
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

// 본인인증 화면 경로(#390). 동의와 같은 방식으로 원래 화면을 next에 붙인다.
export const IDENTITY_PATH = "/onboarding/identity";

/**
 * 본인인증 게이트가 **비켜 가는** 경로(#390).
 *
 * <p>소셜 가입은 인증 없이 회원이 만들어진다(OAuth 콜백은 서버 리다이렉트라 그 사이에
 * 인증창을 끼울 수 없다). 그래서 프론트가 미인증 회원을 인증 화면으로 되돌리는데,
 * <b>전부 막으면 인증을 못 하는 사람이 갇힌다.</b>
 *
 * <p>세 부류를 연다 —
 * <ul>
 *   <li><b>흐름 자체</b>: 온보딩·로그인·가입·인증 콜백. 여기까지 막으면 무한 리다이렉트가 된다.
 *   <li><b>법적 문서</b>: 인증 화면이 개인정보 처리방침을 링크한다. 그 링크가 다시 인증 화면으로
 *       밀리면 <b>무엇에 동의하는지 확인할 수 없다.</b> 약관·운영정책·FAQ·공지도 같다.
 *   <li><b>문의</b>: 인증이 안 되는 사람이 물어볼 창구다. 막으면 갇힌 사람이 연락할 방법이 없다.
 * </ul>
 */
const IDENTITY_GATE_EXEMPT_PREFIXES = [
  "/onboarding",
  "/login",
  "/signup",
  "/auth",
  "/terms",
  "/privacy",
  "/policy",
  "/faq",
  "/notices",
  "/inquiries",
] as const;

function isIdentityGateExempt(pathname: string | null): boolean {
  if (!pathname) {
    return true;
  }
  return IDENTITY_GATE_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

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

  // 본인인증 게이트(#390) — 미인증 회원을 인증 화면으로 되돌린다.
  //
  // **소셜 가입만 이 상태에 도달한다.** 이메일 가입은 서버가 인증 없이는 대기 행조차
  // 만들지 않아(BE PendingSignupService) 미인증 회원이 생기지 않는다. 소셜은 OAuth 콜백이
  // 서버 리다이렉트라 그 사이에 인증창을 끼울 수 없어 회원이 먼저 만들어진다.
  //
  // `/auth/callback`이 신규 회원을 인증 화면으로 보내지만 **거기서 이탈하면 다시 요구하지
  // 않는다** — 다음 로그인은 `new=true`가 아니라 홈으로 간다. 그 구멍을 여기서 막는다.
  //
  // 동의 게이트와 달리 **서버 응답값을 보고 프론트가 판단한다.** 동의는 서버가 403을 주는
  // 진입점이 정해져 있지만, 본인인증의 서버 게이트는 거래 진입점에만 걸려 있어
  // 403을 기다리면 "거래를 눌러야 비로소 안내받는" 지금 동작이 그대로 남는다.
  // 대신 판정 근거는 서버가 내려준 값(`identityVerificationRequired`)이라,
  // 서버 플래그를 끄면 이 게이트도 함께 꺼진다.
  useEffect(() => {
    if (isLoading || !member) {
      return;
    }
    if (!member.identityVerificationRequired || member.identityVerified) {
      return;
    }
    if (isIdentityGateExempt(pathname)) {
      return;
    }
    router.replace(`${IDENTITY_PATH}?next=${encodeURIComponent(pathname ?? "/")}`);
  }, [isLoading, member, pathname, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await apiFetch<TokenResponse>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setAccessToken(tokens.accessToken);
      await fetchMe(tokens.accessToken);
      setIsWithdrawing(false); // 같은 세션에서 다른 계정으로 다시 들어오면 가드는 평소대로 돌아간다.
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
    // 탈퇴 진행 표시(#567) — 성공 뒤 로그인 상태가 풀리는 순간 마이페이지의 비로그인 가드가
    // /login으로 보내 버린다. 이 플래그가 켜져 있는 동안은 가드가 물러서고, 호출측이 완료 화면으로 옮긴다.
    setIsWithdrawing(true);
    // 서버가 프로필을 가명화하고 리프레시 토큰을 폐기한다(backend #120). 진행 중 거래가 있으면
    // 409를 던져 호출측(SettingsTab)이 사유를 표시한다.
    try {
      await fetchWithAuth<void>("/api/members/me", { method: "DELETE" });
    } catch (err) {
      setIsWithdrawing(false); // 실패했으면 회원은 그대로다 — 가드도 평소대로 돌아간다.
      throw err;
    }
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
        isWithdrawing,
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
