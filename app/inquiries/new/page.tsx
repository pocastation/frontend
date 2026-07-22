"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INQUIRY_CATEGORIES } from "@/lib/inquiries";
import { FOCUS_RING } from "@/lib/ui";
import type { InquiryCategory, InquiryResponse } from "@/lib/types";

function ArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export default function NewInquiryPage() {
  const router = useRouter();
  const { accessToken, isLoading, fetchWithAuth } = useAuth();
  const [category, setCategory] = useState<InquiryCategory>("AUCTION");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace("/login?redirect=/inquiries/new");
    }
  }, [accessToken, isLoading, router]);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await fetchWithAuth<InquiryResponse>("/api/inquiries", {
        method: "POST",
        body: {
          category,
          title: title.trim(),
          content: content.trim(),
        },
      });
      router.push("/inquiries/" + created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "문의를 접수하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !accessToken) {
    return <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">로그인을 확인하는 중...</div>;
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-8 sm:py-11">
      <Link
        href="/inquiries"
        className={"inline-flex items-center gap-1 text-sm font-bold text-text-3 hover:text-primary " + FOCUS_RING}
      >
        <ArrowLeft />
        문의 내역
      </Link>

      <header className="mt-6 border-b border-border pb-6">
        <p className="text-xs font-extrabold text-primary">고객지원</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-text-1">문의하기</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-3">
          문의 내용을 자세히 남겨주시면 확인 후 답변드릴게요.
        </p>
      </header>

      <form className="mt-7 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="inquiry-category" className="mb-2 block text-sm font-extrabold text-text-1">
            문의 유형
          </label>
          <select
            id="inquiry-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as InquiryCategory)}
            className={
              "h-12 w-full rounded-r2 border border-border-2 bg-white px-3.5 text-sm font-medium text-text-1 outline-none transition-colors hover:border-primary focus:border-primary " +
              FOCUS_RING
            }
          >
            {INQUIRY_CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="inquiry-title" className="text-sm font-extrabold text-text-1">
              제목
            </label>
            <span className="text-xs tabular-nums text-text-3">{title.length}/100</span>
          </div>
          <input
            id="inquiry-title"
            type="text"
            required
            maxLength={100}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="문의 제목을 입력해 주세요"
            className={
              "h-12 w-full rounded-r2 border border-border-2 bg-white px-3.5 text-sm text-text-1 outline-none placeholder:text-text-3 transition-colors hover:border-primary focus:border-primary " +
              FOCUS_RING
            }
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="inquiry-content" className="text-sm font-extrabold text-text-1">
              문의 내용
            </label>
            <span className="text-xs tabular-nums text-text-3">{content.length}/3,000</span>
          </div>
          <textarea
            id="inquiry-content"
            required
            maxLength={3000}
            rows={12}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={"문의 상황과 궁금한 점을 자세히 적어주세요.\n경매 관련 문의라면 상품명이나 경매 번호를 함께 남겨주세요."}
            className={
              "min-h-[240px] w-full resize-y rounded-r2 border border-border-2 bg-white p-3.5 text-sm leading-relaxed text-text-1 outline-none placeholder:text-text-3 transition-colors hover:border-primary focus:border-primary " +
              FOCUS_RING
            }
          />
          <p className="mt-2 text-xs leading-relaxed text-text-3">
            주민등록번호, 카드 비밀번호 등 민감한 개인정보는 입력하지 마세요.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-r2 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Link
            href="/inquiries"
            className={
              "inline-flex h-11 items-center justify-center rounded-r2 border border-border-2 bg-white px-5 text-sm font-bold text-text-2 hover:border-primary hover:text-primary " +
              FOCUS_RING
            }
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className={
              "h-11 rounded-r2 bg-primary px-6 text-sm font-extrabold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-45 " +
              FOCUS_RING
            }
          >
            {submitting ? "접수 중..." : "문의 접수"}
          </button>
        </div>
      </form>
    </main>
  );
}
