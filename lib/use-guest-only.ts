"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

// 오픈 리다이렉트 방지: 자기 사이트 내부 경로("/foo")만 허용하고 "//host"·"http://..." 등
// 외부/프로토콜 상대 URL은 홈으로 폴백한다.
export function safeRedirectPath(raw: string | null | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/";
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
