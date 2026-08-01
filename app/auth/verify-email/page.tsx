"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";

type Status = "verifying" | "success" | "failed" | "missing";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { accessToken, refresh } = useAuth();
  const [status, setStatus] = useState<Status>(token ? "verifying" : "missing");
  const [message, setMessage] = useState<string | null>(null);
  // React 18 StrictMode의 개발 모드 이중 실행에서 같은 토큰을 두 번 보내면, 두 번째 호출이
  // "이미 사용된 링크"로 실패해 성공 화면 대신 실패 화면이 뜬다(토큰이 1회용이라 그렇다).
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!token || attemptedRef.current) {
      return;
    }
    attemptedRef.current = true;
    (async () => {
      try {
        await apiFetch<void>("/api/auth/email-verification/confirm", {
          method: "POST",
          body: { token },
        });
        setStatus("success");
        // 로그인 상태로 링크를 눌렀다면 /me를 다시 읽어 배너가 바로 사라지게 한다.
        if (accessToken) {
          await refresh();
        }
      } catch (err) {
        setStatus("failed");
        setMessage(err instanceof ApiError ? err.message : "인증에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    })();
  }, [token, accessToken, refresh]);

  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="mb-4 font-display text-xl font-extrabold text-text-1">이메일 인증</h1>

      {status === "verifying" && (
        <p aria-live="polite" className="text-sm text-text-3">
          인증하는 중이에요...
        </p>
      )}

      {status === "missing" && (
        <p role="alert" className="text-sm text-text-2">
          인증 정보가 없는 주소예요. 메일의 버튼을 다시 눌러 주세요.
        </p>
      )}

      {status === "success" && (
        <>
          <p aria-live="polite" className="text-sm text-text-2">
            이메일 인증이 완료됐어요. 이제 입찰·구매·판매를 시작할 수 있어요.
          </p>
          <Link
            href="/"
            className={`mt-6 flex h-11 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
          >
            둘러보러 가기
          </Link>
        </>
      )}

      {status === "failed" && (
        <>
          <p role="alert" className="text-sm text-text-2">
            {message}
          </p>
          {/* 재발송은 로그인 상태에서만 가능하다(비로그인 재발송은 임의 주소로 메일을
              쏘는 도구가 된다). 마이페이지 상단 배너에 재발송 버튼이 있다. */}
          <p className="mt-2 text-xs text-text-3">
            로그인하면 화면 위쪽 안내에서 인증 메일을 다시 받을 수 있어요.
          </p>
          <Link
            href="/login"
            className={`mt-6 flex h-11 items-center justify-center ${SECONDARY_BUTTON_CLASS}`}
          >
            로그인하러 가기
          </Link>
        </>
      )}
    </div>
  );
}

// useSearchParams()는 Suspense 경계 안에서만 쓸 수 있다(빌드 시 정적 최적화 요구사항).
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">불러오는 중...</div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
