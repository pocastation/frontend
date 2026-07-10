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
        router.replace(isNewMember ? "/onboarding/nickname" : "/");
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
