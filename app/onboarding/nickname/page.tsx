"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import NicknameSuggestButton from "@/components/NicknameSuggestButton";
import ConsentFields, {
  EMPTY_CONSENTS,
  hasAllRequiredConsents,
  type ConsentValues,
} from "@/components/ConsentFields";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/ui";

export default function NicknameOnboardingPage() {
  const router = useRouter();
  const { accessToken, member, isLoading, completeOnboarding, fetchWithAuth } = useAuth();
  const nicknameId = useId();
  const [nickname, setNickname] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [consents, setConsents] = useState<ConsentValues>(EMPTY_CONSENTS);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!prefilled && member) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 컨텍스트에서 로드되는 member를 1회만 프리필
      setNickname(member.nickname);
      setPrefilled(true);
    }
  }, [member, prefilled]);

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace("/login");
    }
  }, [isLoading, accessToken, router]);

  /**
   * 온보딩 다음 목적지(#319).
   *
   * 본인인증 게이트가 켜져 있을 때만 인증 단계로 보낸다. 꺼져 있으면 인증을 완료할 수단 자체가
   * 없으므로(대행사 어댑터 미계약), 보내봐야 아무것도 못 하는 화면을 한 번 더 거치게 할 뿐이다.
   * 조회에 실패하면 홈으로 — 가입 마지막 단계에서 상태 조회 하나 때문에 막히면 안 된다.
   */
  async function nextStepAfterOnboarding(): Promise<string> {
    try {
      const status = await fetchWithAuth<{ verified: boolean; required: boolean }>(
        "/api/members/me/identity-verification",
      );
      return status.required && !status.verified ? "/onboarding/identity" : "/";
    } catch {
      return "/";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // 서버도 같은 규칙으로 막지만(BE #183), 제출 후 400을 보여주기보다 여기서 먼저 안내한다.
    if (!hasAllRequiredConsents(consents)) {
      setError("필수 항목에 모두 동의해야 시작할 수 있어요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await completeOnboarding({ nickname, ...consents });
      router.replace(await nextStepAfterOnboarding());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "가입 절차를 완료하지 못했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-center font-display text-xl font-extrabold text-text-1">
        가입을 마무리해주세요
      </h1>
      <p className="mb-6 text-center text-xs text-text-3">
        닉네임은 매물·거래에서 다른 사용자에게 보여지는 이름이에요. 나중에도 바꿀 수 있어요.
      </p>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <label htmlFor={nicknameId} className="sr-only">
          닉네임
        </label>
        <input
          id={nicknameId}
          type="text"
          required
          maxLength={50}
          autoComplete="nickname"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={INPUT_CLASS}
        />
        <NicknameSuggestButton onSuggest={setNickname} />
        <div className="mt-1">
          <ConsentFields values={consents} onChange={setConsents} />
        </div>
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
          {isSubmitting ? "저장 중..." : "시작하기"}
        </button>
      </form>
    </div>
  );
}
