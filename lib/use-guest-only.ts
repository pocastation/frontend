"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

/**
 * 로그인/회원가입처럼 "비로그인 사용자 전용"인 페이지에서 쓴다.
 * 이미 로그인된 상태로 접근하면(뒤로가기, 직접 URL 이동 등) 홈으로 돌려보낸다.
 * 리다이렉트 URI 경로엔 refreshToken 쿠키가 안 실려서(path=/api/auth) 미들웨어로는
 * 판단이 안 되고, 클라이언트에서 세션 복구가 끝난 뒤에만 판단 가능하다.
 */
export function useGuestOnly() {
  const router = useRouter();
  const { accessToken, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && accessToken) {
      router.replace("/");
    }
  }, [isLoading, accessToken, router]);

  return { isLoading, isGuest: !isLoading && !accessToken };
}
