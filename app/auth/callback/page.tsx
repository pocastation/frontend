"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    refresh().then((token) => {
      if (cancelled) return;
      if (token) {
        router.replace("/");
      } else {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh, router]);

  return (
    <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">
      {failed ? "로그인에 실패했습니다. 다시 시도해주세요." : "로그인 처리 중..."}
    </div>
  );
}
