"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { GoogleIcon, KakaoIcon, NaverIcon } from "@/components/SocialIcons";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
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
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-center font-display text-xl font-extrabold text-text-1">
        로그인
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
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-r2 border border-border px-3.5 py-2.5 text-sm outline-none focus:border-primary"
        />
        {error && <p className="text-xs text-accent">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-full bg-primary py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] text-text-3">
        <span className="h-px flex-1 bg-border" />
        또는
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2">
        <a
          href={`${API_URL}/oauth2/authorization/kakao`}
          className="flex items-center justify-center gap-2 rounded-r3 bg-[#FEE500] py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          <KakaoIcon />
          카카오로 시작하기
        </a>
        <a
          href={`${API_URL}/oauth2/authorization/naver`}
          className="flex items-center justify-center gap-2 rounded-r3 bg-[#03C75A] py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <NaverIcon />
          네이버로 시작하기
        </a>
        <a
          href={`${API_URL}/oauth2/authorization/google`}
          className="flex items-center justify-center gap-2 rounded-r3 border border-[#DADCE0] bg-white py-2.5 text-sm font-bold text-[#3C4043] transition-opacity hover:opacity-80"
        >
          <GoogleIcon />
          구글로 시작하기
        </a>
      </div>

      <p className="mt-4 text-center text-xs text-text-3">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="font-semibold text-primary">
          회원가입
        </Link>
      </p>
    </div>
  );
}
