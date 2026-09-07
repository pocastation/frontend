"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

// 리다이렉트 검사의 기준 origin. 실제 사이트 주소일 필요는 없다 — 「파싱했을 때 여기 그대로 남는가」만 본다.
const REDIRECT_BASE = "https://redirect-check.invalid";

/**
 * 오픈 리다이렉트 방지: 자기 사이트 내부 경로만 허용하고 나머지는 홈으로 폴백한다.
 *
 * 🔴 문자열 검사(`/`로 시작·`//`로 시작 안 함)로는 부족했다(#584). WHATWG URL은 http(s)에서 백슬래시를
 * 슬래시로 취급해 `/\evil.com`이 `https://evil.com/`으로 해석되고, Next 라우터는 origin이 다르면 하드
 * 내비게이션을 한다. 그래서 브라우저가 실제로 쓰는 파서에 고정 origin을 붙여 파싱하고, origin이 그대로
 * 남을 때만 경로·쿼리·해시를 돌려준다. `//host`·`http://…`·`javascript:`·빈 값은 전부 홈이다.
 */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/")) {
    return "/";
  }
  try {
    const url = new URL(raw, REDIRECT_BASE);
    if (url.origin !== REDIRECT_BASE) {
      return "/";
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

/**
 * 로그인/회원가입처럼 "비로그인 사용자 전용"인 페이지에서 쓴다.
 * 이미 로그인된 상태로 접근하면(뒤로가기, 직접 URL 이동 등) 돌려보낸다.
 * redirect 파라미터가 있으면 그 경로로(입찰하려다 로그인한 경우 원래 경매로 복귀), 없으면 홈으로.
 * 리다이렉트 URI 경로엔 refreshToken 쿠키가 안 실려서(path=/api/auth) 미들웨어로는
 * 판단이 안 되고, 클라이언트에서 세션 복구가 끝난 뒤에만 판단 가능하다.
 */
export function useGuestOnly(redirectTo: string = "/") {
  const router = useRouter();
  const { accessToken, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && accessToken) {
      router.replace(redirectTo);
    }
  }, [isLoading, accessToken, router, redirectTo]);

  return { isLoading, isGuest: !isLoading && !accessToken };
}
