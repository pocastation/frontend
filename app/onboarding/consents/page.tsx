"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import ConsentFields, {
  EMPTY_CONSENTS,
  hasAllRequiredConsents,
  type ConsentValues,
} from "@/components/ConsentFields";
import { PRIMARY_BUTTON_CLASS } from "@/lib/ui";

// 재동의 화면(#219, BE #198).
//
// 대상은 동의 기록이 없는 기존 회원이다 — member_consents 테이블이 BE #184에서 처음 생겨서,
// 그 이전 가입자는 이메일·소셜 가릴 것 없이 기록이 0건이다. 이들은 nicknameOnboarded=true라
// 기존 온보딩 화면(/onboarding/nickname)으로는 갈 수 없다(서버가 ALREADY_ONBOARDED로 막는다).
//
// 닉네임을 받지 않는 이유: 대상은 닉네임이 이미 확정된 회원이라, 여기서 다시 받으면
// 중복·변경제한 규칙까지 얽혀 실패 지점만 늘어난다.
function ConsentsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, isLoading, fetchWithAuth, recordConsents } = useAuth();

  const [consents, setConsents] = useState<ConsentValues>(EMPTY_CONSENTS);
  const [status, setStatus] = useState<"checking" | "needed" | "done">("checking");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 동의를 마치면 원래 있던 화면으로 돌려보낸다. 외부 URL로 튕기지 않도록 내부 경로만 허용한다.
  const nextPath = (() => {
    const raw = searchParams.get("next");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  })();

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace("/login");
    }
  }, [isLoading, accessToken, router]);

  // 이미 동의한 회원이 주소로 직접 들어오면 빈 폼을 다시 보여주지 않는다.
  // 서버 게이트와 같은 기준(GET /me/consents)을 보므로 "화면은 통과했는데 API가 403"이 생기지 않는다.
  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchWithAuth<{ consented: boolean }>("/api/members/me/consents");
        if (!cancelled) {
          setStatus(res.consented ? "done" : "needed");
        }
      } catch {
        // 조회에 실패해도 화면은 열어둔다 — 동의를 못 내는 상태로 갇히는 것보다 낫다.
        if (!cancelled) {
          setStatus("needed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, fetchWithAuth]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // 서버도 같은 규칙으로 막지만, 제출 후 400을 보여주기보다 여기서 먼저 안내한다.
    if (!hasAllRequiredConsents(consents)) {
      setError("필수 항목에 모두 동의해야 계속할 수 있어요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await recordConsents(consents);
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "동의를 저장하지 못했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "checking") {
    return <p className="py-16 text-center text-sm text-text-3">확인하는 중...</p>;
  }

  if (status === "done") {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-text-2">이미 동의를 마치셨어요.</p>
        <button
          type="button"
          onClick={() => router.replace(nextPath)}
          className={`inline-flex h-11 items-center justify-center px-6 ${PRIMARY_BUTTON_CLASS}`}
        >
          계속하기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <ConsentFields values={consents} onChange={setConsents} />
      {error && (
        <p role="alert" aria-live="polite" className="text-xs text-accent">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`flex h-11 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
      >
        {isSubmitting ? "저장 중..." : "동의하고 계속하기"}
      </button>
    </form>
  );
}

export default function ConsentsPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-center font-display text-xl font-extrabold text-text-1">
        약관 동의가 필요해요
      </h1>
      <p className="mb-6 text-center text-xs text-text-3">
        서비스 이용을 계속하려면 이용약관과 개인정보 처리방침에 동의해주세요. 동의 내역은 가입 시점과
        동일하게 기록됩니다.
      </p>
      {/* useSearchParams는 Suspense 경계가 필요하다(App Router). */}
      <Suspense fallback={<p className="py-16 text-center text-sm text-text-3">확인하는 중...</p>}>
        <ConsentsForm />
      </Suspense>
    </div>
  );
}
