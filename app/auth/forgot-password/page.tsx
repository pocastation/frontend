"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";

export default function ForgotPasswordPage() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch<void>("/api/auth/password-reset/request", {
        method: "POST",
        body: { email },
      });
      setIsSent(true);
    } catch (err) {
      // 서버는 가입 여부와 무관하게 성공을 준다 — 여기 걸리는 건 형식 오류나 요청 과다(429)뿐이다.
      setError(err instanceof ApiError ? err.message : "요청에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <h1 className="mb-4 font-display text-xl font-extrabold text-text-1">메일을 보냈어요</h1>
        {/*
          ★ "가입된 이메일이면"이라고 쓰는 이유 — 서버는 가입 여부와 무관하게 같은 응답을 준다.
          여기서 "메일을 보냈습니다"라고 단정하면 화면이 곧 계정 존재 여부 확인 도구가 되고,
          유출된 이메일 목록에서 우리 회원만 골라내 표적 피싱에 쓸 수 있다. 문구가 방어의 일부다.
        */}
        <p aria-live="polite" className="text-sm leading-relaxed text-text-2">
          <span className="font-bold text-text-1">{email}</span> 이 가입된 주소라면
          <br />
          비밀번호 재설정 링크를 보냈어요.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-text-3">
          메일이 보이지 않으면 스팸함도 확인해 주세요.
          <br />
          링크는 30분 동안만 유효해요.
          <br />
          소셜 로그인으로 가입했다면 비밀번호가 없어 메일이 오지 않아요.
        </p>
        <Link
          href="/login"
          className={`mt-6 flex h-11 items-center justify-center ${SECONDARY_BUTTON_CLASS}`}
        >
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-center font-display text-xl font-extrabold text-text-1">
        비밀번호 찾기
      </h1>
      <p className="mb-6 text-center text-xs leading-relaxed text-text-3">
        가입할 때 쓴 이메일 주소를 입력하면
        <br />
        재설정 링크를 보내드려요.
      </p>
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
        {error && (
          <p role="alert" aria-live="polite" className="text-xs text-accent">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting || email.length === 0}
          className={`mt-2 flex h-11 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
        >
          {isSubmitting ? "보내는 중..." : "재설정 링크 받기"}
        </button>
      </form>
      <Link
        href="/login"
        className={`mt-3 flex h-11 items-center justify-center ${SECONDARY_BUTTON_CLASS}`}
      >
        로그인으로 돌아가기
      </Link>
    </div>
  );
}
