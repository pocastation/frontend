"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/ui";

export default function NicknameOnboardingPage() {
  const router = useRouter();
  const { accessToken, member, isLoading, updateNickname } = useAuth();
  const nicknameId = useId();
  const [nickname, setNickname] = useState("");
  const [prefilled, setPrefilled] = useState(false);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await updateNickname(nickname);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "닉네임 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-center font-display text-xl font-extrabold text-text-1">
        닉네임을 확인해주세요
      </h1>
      <p className="mb-6 text-center text-xs text-text-3">
        경매·거래에서 다른 사용자에게 보여지는 이름이에요. 나중에도 바꿀 수 있어요.
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
