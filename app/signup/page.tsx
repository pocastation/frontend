"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError, fetchNicknameSuggestion } from "@/lib/api";
import { useGuestOnly } from "@/lib/use-guest-only";
import NicknameSuggestButton from "@/components/NicknameSuggestButton";
import ConsentFields, {
  EMPTY_CONSENTS,
  hasAllRequiredConsents,
  type ConsentValues,
} from "@/components/ConsentFields";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/ui";

export default function SignupPage() {
  const router = useRouter();
  const { isLoading, isGuest } = useGuestOnly();
  const emailId = useId();
  const passwordId = useId();
  const nicknameId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [consents, setConsents] = useState<ConsentValues>(EMPTY_CONSENTS);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 진입 시 서비스가 생성한 닉네임을 기본값으로 채운다("따뜻한북극여우" 류). 사용자가 맘에 안 들면
  // "다른 닉네임 추천"을 누르거나 직접 수정하면 된다.
  useEffect(() => {
    let active = true;
    void fetchNicknameSuggestion()
      .then((n) => active && setNickname((prev) => prev || n))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // 서버도 같은 규칙으로 막지만(BE #183), 제출 후 400을 보여주기보다 여기서 먼저 안내한다.
    if (!hasAllRequiredConsents(consents)) {
      setError("필수 항목에 모두 동의해야 가입할 수 있어요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch("/api/members/signup", {
        method: "POST",
        body: { email, password, nickname, ...consents },
      });
      router.replace("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">
        불러오는 중...
      </div>
    );
  }
  if (!isGuest) {
    return null;
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-center font-display text-xl font-extrabold text-text-1">
        회원가입
      </h1>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <label htmlFor={emailId} className="sr-only">
          이메일
        </label>
        <input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={INPUT_CLASS}
        />
        <label htmlFor={passwordId} className="sr-only">
          비밀번호
        </label>
        <input
          id={passwordId}
          type="password"
          required
          minLength={8}
          maxLength={64}
          autoComplete="new-password"
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={INPUT_CLASS}
        />
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
        <button type="submit" disabled={isSubmitting} className={`mt-2 py-2.5 ${PRIMARY_BUTTON_CLASS}`}>
          {isSubmitting ? "가입 중..." : "회원가입"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-text-3">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="rounded-r1 font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          로그인
        </Link>
      </p>
    </div>
  );
}
