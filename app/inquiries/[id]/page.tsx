"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import InquiryStatusBadge from "@/components/InquiryStatusBadge";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatInquiryDate,
  INQUIRY_CATEGORY_LABEL,
  INQUIRY_STATUS_LABEL,
} from "@/lib/inquiries";
import { FOCUS_RING } from "@/lib/ui";
import type { InquiryResponse, InquiryStatus } from "@/lib/types";

const STATUS_STEPS: InquiryStatus[] = ["RECEIVED", "CHECKING", "ANSWERED"];

function ArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export default function InquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, isLoading, fetchWithAuth } = useAuth();
  const [inquiry, setInquiry] = useState<InquiryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWithAuth<InquiryResponse>("/api/members/me/inquiries/" + params.id);
      setInquiry(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "문의를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, params.id]);

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) {
      router.replace("/login?redirect=/inquiries/" + params.id);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 인증 확정 후 본인 문의 상세를 동기화한다.
    void load();
  }, [accessToken, isLoading, load, params.id, router]);

  if (isLoading || !accessToken) {
    return <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">문의를 불러오는 중...</div>;
  }

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:py-11">
      <Link
        href="/inquiries"
        className={"inline-flex items-center gap-1 text-sm font-bold text-text-3 hover:text-primary " + FOCUS_RING}
      >
        <ArrowLeft />
        문의 내역
      </Link>

      {error && (
        <div className="mt-8 border-y border-border py-16 text-center">
          <p role="alert" className="text-sm font-semibold text-accent">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className={"mt-4 rounded-r2 border border-border-2 px-4 py-2 text-sm font-bold text-text-2 hover:text-primary " + FOCUS_RING}
          >
            다시 시도
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-24 text-center text-sm text-text-3">불러오는 중...</p>
      ) : inquiry ? (
        <>
          <header className="mt-6 border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-primary">{INQUIRY_CATEGORY_LABEL[inquiry.category]}</span>
              <InquiryStatusBadge status={inquiry.status} />
            </div>
            <h1 className="mt-3 break-words font-display text-xl font-extrabold leading-snug text-text-1 sm:text-2xl">
              {inquiry.title}
            </h1>
            <p className="mt-2 text-xs text-text-3">접수일 {formatInquiryDate(inquiry.createdAt)}</p>
          </header>

          <ol className="grid grid-cols-3 border-b border-border py-6" aria-label="문의 처리 단계">
            {STATUS_STEPS.map((step, index) => {
              const currentIndex = STATUS_STEPS.indexOf(inquiry.status);
              const reached = index <= currentIndex;
              return (
                <li key={step} className="relative flex flex-col items-center text-center">
                  {index > 0 && (
                    <span
                      className={"absolute right-1/2 top-3 h-px w-full " + (reached ? "bg-primary" : "bg-border-2")}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={
                      "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-extrabold " +
                      (reached ? "border-primary bg-primary text-white" : "border-border-2 bg-white text-text-3")
                    }
                  >
                    {index + 1}
                  </span>
                  <span className={"mt-2 text-xs font-bold " + (reached ? "text-text-1" : "text-text-3")}>
                    {INQUIRY_STATUS_LABEL[step]}
                  </span>
                </li>
              );
            })}
          </ol>

          <article className="py-7" aria-labelledby="inquiry-content-title">
            <h2 id="inquiry-content-title" className="text-sm font-extrabold text-text-1">문의 내용</h2>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-text-2">{inquiry.content}</p>
          </article>

          <section
            className={
              "border-y px-5 py-7 sm:px-6 " +
              (inquiry.status === "ANSWERED" ? "border-ok/20 bg-ok-soft/60" : "border-border bg-surface-2/60")
            }
            aria-labelledby="inquiry-answer-title"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="inquiry-answer-title" className="text-sm font-extrabold text-text-1">답변</h2>
              {inquiry.answeredAt && <span className="text-xs text-text-3">{formatInquiryDate(inquiry.answeredAt)}</span>}
            </div>
            {inquiry.answer ? (
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-text-2">{inquiry.answer}</p>
            ) : (
              <div className="mt-4">
                <p className="text-sm font-bold text-text-2">
                  {inquiry.status === "CHECKING" ? "담당자가 문의 내용을 확인하고 있어요." : "문의가 정상적으로 접수됐어요."}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-3">답변이 등록되면 알림으로 알려드릴게요.</p>
              </div>
            )}
          </section>

          <div className="mt-7 flex justify-end">
            <Link
              href="/inquiries/new"
              className={
                "inline-flex h-10 items-center rounded-r2 border border-border-2 bg-white px-4 text-sm font-bold text-text-2 hover:border-primary hover:text-primary " +
                FOCUS_RING
              }
            >
              추가 문의하기
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}
