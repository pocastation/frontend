"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const isNewMember = searchParams.get("new") === "true";
    refresh().then((token) => {
      if (cancelled) return;
      if (token) {
        // 소셜 신규 가입은 본인인증 → 닉네임·동의 순으로 잇는다(#321).
        // 인증을 먼저 두는 이유는 "인증된 사람만 가입을 마친다"가 정책이기 때문이고,
        // 게이트가 꺼져 있으면 /onboarding/identity가 스스로 next로 넘긴다.
        router.replace(
          isNewMember ? "/onboarding/identity?next=%2Fonboarding%2Fnickname" : "/",
        );
      } else {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh, router, searchParams]);

  return (
    <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">
      {failed ? "로그인에 실패했습니다. 다시 시도해주세요." : "로그인 처리 중..."}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">
          로그인 처리 중...
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
