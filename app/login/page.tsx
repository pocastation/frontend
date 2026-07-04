"use client";

import { Suspense, useId, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useGuestOnly, safeRedirectPath } from "@/lib/use-guest-only";
import { ApiError } from "@/lib/api";
import { FOCUS_RING, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import { GoogleIcon } from "@/components/GoogleIcon";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirect"));
  const { login } = useAuth();
  const { isLoading, isGuest } = useGuestOnly(redirectTo);
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다.");
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
        로그인
      </h1>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
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
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={passwordId} className="sr-only">
            비밀번호
          </label>
          <input
            id={passwordId}
            type="password"
            required
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            className={INPUT_CLASS}
          />
        </div>
        {error && (
          <p role="alert" aria-live="polite" className="text-xs text-accent">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`mt-2 flex h-11 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <Link href="/signup" className={`mt-3 flex h-11 items-center justify-center ${SECONDARY_BUTTON_CLASS}`}>
        이메일 회원가입
      </Link>

      <div className="my-5 flex items-center gap-3 text-[11px] text-text-3">
        <span className="h-px flex-1 bg-border" />
        또는
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex justify-center gap-6">
        {/* 카카오: 심볼 단독 에셋이 없어 완성형 이미지를 원형 안에서 CSS로 윈도잉한다(파일 자체는
            무수정, 보이는 영역만 제한 — 심볼 색상·모양·비율은 유지). 단, 카카오 가이드는 버튼을
            심볼+라벨+컨테이너(12px radius) 필수 구성으로 명시하는데 이 아이콘 전용 원형 배지는
            그 구조와 정확히 일치하진 않는다(라벨이 버튼 밖 캡션으로 분리, radius도 원형).
            디자인 통일성을 위해 의도적으로 감수한 트레이드오프 — 카카오가 아이콘 전용 공식
            에셋을 제공하면 교체 권장. */}
        <a
          href={`${API_URL}/oauth2/authorization/kakao`}
          className={`flex flex-col items-center gap-1.5 rounded-r2 p-1 transition-transform hover:scale-105 active:scale-95 ${FOCUS_RING}`}
        >
          <span className="block h-11 w-11 overflow-hidden rounded-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- 공식 배포 에셋의 심볼 영역만 노출(파일 수정 없음) */}
            <img
              src="/oauth/kakao-login.png"
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: "0% 50%" }}
            />
          </span>
          <span className="text-[11px] text-text-3">카카오</span>
        </a>
        <a
          href={`${API_URL}/oauth2/authorization/naver`}
          className={`flex flex-col items-center gap-1.5 rounded-r2 p-1 transition-transform hover:scale-105 active:scale-95 ${FOCUS_RING}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 네이버 공식 아이콘형 에셋 그대로 사용 */}
          <img src="/oauth/naver-icon.png" alt="" className="h-11 w-11" />
          <span className="text-[11px] text-text-3">네이버</span>
        </a>
        <a
          href={`${API_URL}/oauth2/authorization/google`}
          className={`flex flex-col items-center gap-1.5 rounded-r2 p-1 transition-transform hover:scale-105 active:scale-95 ${FOCUS_RING}`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DADCE0] bg-white">
            <GoogleIcon />
          </span>
          <span className="text-[11px] text-text-3">구글</span>
        </a>
      </div>
    </div>
  );
}

// useSearchParams()는 Suspense 경계 안에서만 쓸 수 있다(빌드 시 정적 최적화 요구사항).
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">불러오는 중...</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
