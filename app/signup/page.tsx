"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { useGuestOnly } from "@/lib/use-guest-only";

export default function SignupPage() {
  const router = useRouter();
  const { isLoading, isGuest } = useGuestOnly();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/api/members/signup", {
        method: "POST",
        body: { email, password, nickname },
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-r2 border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          type="password"
          required
          minLength={8}
          maxLength={64}
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-r2 border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          type="text"
          required
          maxLength={50}
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="rounded-r2 border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary"
        />
        {error && <p className="text-xs text-accent">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-full bg-primary py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {isSubmitting ? "가입 중..." : "회원가입"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-text-3">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-primary">
          로그인
        </Link>
      </p>
    </div>
  );
}
