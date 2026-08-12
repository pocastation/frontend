"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import IdentityVerificationPanel, {
  type IdentityStatus,
} from "@/components/IdentityVerificationPanel";

// 가입 흐름의 본인인증 단계(#319, #321).
//
// **「나중에 하기」는 두지 않는다.** 인증을 건너뛸 수 있게 보이면 정책과 어긋나고,
// 심사 자료에도 "본인인증 없이 가입 가능"으로 읽힌다.
//
// 그렇다고 인증 수단이 없는 동안 여기 세우면 가입 자체가 막다른 길이 된다(동의 게이트 #199).
// 그래서 **게이트가 꺼져 있으면 이 단계를 건너뛴다.** 건너뛸지는 `next` 유무로 가른다.
//
//   next 있음 — 온보딩 흐름에서 왔다. 게이트가 꺼져 있으면 즉시 다음 단계로 넘긴다.
//   next 없음 — 마이페이지나 주소로 직접 왔다. 자발적 진입이므로 항상 화면을 보여준다.
function IdentityOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, isLoading } = useAuth();
  const [skipping, setSkipping] = useState(false);

  const rawNext = searchParams.get("next");
  const isOnboardingFlow = Boolean(rawNext);
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace("/login");
    }
  }, [isLoading, accessToken, router]);

  const handleStatus = useCallback(
    (status: IdentityStatus) => {
      // 이미 인증했거나, 게이트가 꺼져 있어 지금은 받을 수 없는 상태면 다음 단계로 넘긴다.
      if (isOnboardingFlow && (status.verified || !status.required)) {
        setSkipping(true);
        router.replace(nextPath);
      }
    },
    [isOnboardingFlow, nextPath, router],
  );

  if (skipping) {
    return <p className="py-16 text-center text-sm text-text-3">확인하는 중...</p>;
  }

  return (
    <IdentityVerificationPanel
      onStatusLoaded={handleStatus}
      onVerified={() => router.replace(nextPath)}
    />
  );
}

export default function IdentityOnboardingPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-center font-display text-xl font-extrabold text-text-1">
        본인인증
      </h1>
      {/* useSearchParams는 Suspense 경계가 필요하다(App Router). */}
      <Suspense fallback={<p className="py-16 text-center text-sm text-text-3">확인하는 중...</p>}>
        <IdentityOnboarding />
      </Suspense>
    </div>
  );
}
