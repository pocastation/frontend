"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IDENTITY_PATH, isIdentityGateExempt, useAuth } from "@/lib/auth-context";

/**
 * 본인인증 게이트(#390) — 미인증 회원을 인증 화면으로 되돌린다. 아무것도 그리지 않는다.
 *
 * <p>**소셜 가입만 이 상태에 도달한다.** 이메일 가입은 서버가 인증 없이는 대기 행조차
 * 만들지 않아(BE PendingSignupService) 미인증 회원이 생기지 않는다. 소셜은 OAuth 콜백이
 * 서버 리다이렉트라 그 사이에 인증창을 끼울 수 없어 회원이 먼저 만들어진다.
 *
 * <p>`/auth/callback`이 신규 회원을 인증 화면으로 보내지만 **거기서 이탈하면 다시 요구하지
 * 않는다** — 다음 로그인은 `new=true`가 아니라 홈으로 간다. 그 구멍을 여기서 막는다.
 *
 * <p>동의 게이트와 달리 **서버 응답값을 보고 프론트가 판단한다.** 동의는 서버가 403을 주는
 * 진입점이 정해져 있지만, 본인인증의 서버 게이트는 거래 진입점에만 걸려 있어
 * 403을 기다리면 "거래를 눌러야 비로소 안내받는" 지금 동작이 그대로 남는다.
 * 대신 판정 근거는 서버가 내려준 값(`identityVerificationRequired`)이라,
 * 서버 플래그를 끄면 이 게이트도 함께 꺼진다.
 *
 * <p>AuthProvider 안에 있던 효과를 컴포넌트로 뺀 이유(#565): 예외 판정이 경로만이 아니라
 * 쿼리(`/mypage?tab=settings`)까지 봐야 하는데, `useSearchParams`는 Suspense 경계 안에서만
 * 쓸 수 있다. 루트 레이아웃이 이 컴포넌트를 `<Suspense>`로 감싼다(MobileTabBar와 같은 방식).
 */
export default function IdentityGateRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { member, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !member) {
      return;
    }
    if (!member.identityVerificationRequired || member.identityVerified) {
      return;
    }
    if (isIdentityGateExempt(pathname, searchParams)) {
      return;
    }
    router.replace(`${IDENTITY_PATH}?next=${encodeURIComponent(pathname ?? "/")}`);
  }, [isLoading, member, pathname, searchParams, router]);

  return null;
}
