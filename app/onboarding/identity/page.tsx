"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import IdentityVerificationPanel from "@/components/IdentityVerificationPanel";

// 가입 흐름의 본인인증 단계(#319).
//
// 강제 단계가 아니다. 서버가 required=false를 내리는 동안에는 닉네임 온보딩이 이 화면을
// 건너뛰므로(app/onboarding/nickname), 여기 도달하는 경로는 ① required=true일 때의 온보딩
// ② 마이페이지에서의 직접 진입 두 가지다.
//
// 나중에 미룰 수 있게 두는 이유: 대행사 어댑터가 붙기 전에는 인증을 완료할 방법이 없다.
// 빠져나갈 문 없이 세우면 그 순간 가입 자체가 막다른 길이 된다(동의 게이트 #199의 교훈).
function IdentityOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, isLoading } = useAuth();

  const nextPath = (() => {
    const raw = searchParams.get("next");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  })();

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace("/login");
    }
  }, [isLoading, accessToken, router]);

  return (
    <>
      <IdentityVerificationPanel onVerified={() => router.replace(nextPath)} />
      <button
        type="button"
        onClick={() => router.replace(nextPath)}
        className="mt-4 w-full text-center text-xs font-bold text-text-3 underline underline-offset-4 hover:text-text-2"
      >
        나중에 하기
      </button>
    </>
  );
}

export default function IdentityOnboardingPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-center font-display text-xl font-extrabold text-text-1">
        본인인증
      </h1>
      <p className="mb-8 text-center text-xs text-text-3">
        안전한 거래를 위해 휴대폰으로 본인 명의를 확인해요.
      </p>
      {/* useSearchParams는 Suspense 경계가 필요하다(App Router). */}
      <Suspense fallback={<p className="py-16 text-center text-sm text-text-3">확인하는 중...</p>}>
        <IdentityOnboarding />
      </Suspense>
    </div>
  );
}
