"use client";

import { Suspense, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";

// 백엔드 PasswordResetConfirmRequest와 같은 규칙(8~64자). 여기가 느슨하면 서버가 400을 주고,
// 엄격하면 통과할 비밀번호를 막는다 — 어느 쪽이든 규칙은 한 벌이어야 한다.
const MIN_LENGTH = 8;
const MAX_LENGTH = 64;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const passwordId = useId();
  const confirmId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const canSubmit =
    token != null && password.length >= MIN_LENGTH && password === confirmPassword && !isSubmitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch<void>("/api/auth/password-reset/confirm", {
        method: "POST",
        body: { token, password },
      });
      setIsDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "재설정에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="mb-4 font-display text-xl font-extrabold text-text-1">비밀번호 재설정</h1>
        <p role="alert" className="text-sm text-text-2">
          재설정 정보가 없는 주소예요. 메일의 버튼을 다시 눌러 주세요.
        </p>
        <Link
          href="/auth/forgot-password"
          className={`mt-6 flex h-11 items-center justify-center ${SECONDARY_BUTTON_CLASS}`}
        >
          링크 다시 받기
        </Link>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="mb-4 font-display text-xl font-extrabold text-text-1">
          비밀번호가 변경됐어요
        </h1>
        {/* 서버가 재설정 시점에 기존 리프레시 토큰을 전부 폐기한다 — 다른 기기에서 로그인돼
            있었다면 그쪽도 끊긴다는 걸 미리 알려야 "왜 로그아웃됐지?"가 안 생긴다. */}
        <p aria-live="polite" className="text-sm leading-relaxed text-text-2">
          새 비밀번호로 로그인해 주세요.
          <br />
          <span className="text-xs text-text-3">
            보안을 위해 다른 기기의 로그인은 모두 해제됐어요.
          </span>
        </p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className={`mt-6 flex h-11 w-full items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-center font-display text-xl font-extrabold text-text-1">
        새 비밀번호 설정
      </h1>
      <p className="mb-6 text-center text-xs text-text-3">
        {MIN_LENGTH}자 이상 {MAX_LENGTH}자 이하로 입력해 주세요.
      </p>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <label htmlFor={passwordId} className="sr-only">
          새 비밀번호
        </label>
        <input
          id={passwordId}
          type="password"
          required
          autoComplete="new-password"
          maxLength={MAX_LENGTH}
          placeholder="새 비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={tooShort ? true : undefined}
          className={INPUT_CLASS}
        />
        <label htmlFor={confirmId} className="sr-only">
          새 비밀번호 확인
        </label>
        <input
          id={confirmId}
          type="password"
          required
          autoComplete="new-password"
          maxLength={MAX_LENGTH}
          placeholder="새 비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          aria-invalid={mismatch ? true : undefined}
          className={INPUT_CLASS}
        />
        {tooShort && (
          <p aria-live="polite" className="text-xs text-text-3">
            {MIN_LENGTH}자 이상 입력해 주세요.
          </p>
        )}
        {mismatch && (
          <p aria-live="polite" className="text-xs text-accent">
            비밀번호가 서로 달라요.
          </p>
        )}
        {error && (
          <p role="alert" aria-live="polite" className="text-xs text-accent">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`mt-2 flex h-11 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
        >
          {isSubmitting ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
      <Link
        href="/auth/forgot-password"
        className={`mt-3 flex h-11 items-center justify-center ${SECONDARY_BUTTON_CLASS}`}
      >
        링크 다시 받기
      </Link>
    </div>
  );
}

// useSearchParams()는 Suspense 경계 안에서만 쓸 수 있다(빌드 시 정적 최적화 요구사항).
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">불러오는 중...</div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
