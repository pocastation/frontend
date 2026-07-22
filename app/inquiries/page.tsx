"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InquiryNotices from "@/components/InquiryNotices";
import InquiryStatusBadge from "@/components/InquiryStatusBadge";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatInquiryDate, INQUIRY_CATEGORY_LABEL } from "@/lib/inquiries";
import { FOCUS_RING } from "@/lib/ui";
import type { InquiryListResponse, InquiryResponse, InquiryStatus } from "@/lib/types";

type Filter = InquiryStatus | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "ANSWERED", label: "답변완료" },
  { value: "CHECKING", label: "확인중" },
  { value: "RECEIVED", label: "접수완료" },
];

const PAGE_SIZE = 20;

function EmptyInquiryIcon() {
  return (
    <svg width="54" height="54" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M15 10h28a5 5 0 0 1 5 5v25a5 5 0 0 1-5 5H28L16 54v-9h-1a5 5 0 0 1-5-5V15a5 5 0 0 1 5-5Z" fill="currentColor" opacity=".12" />
      <path d="M21 23h17M21 31h13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".4" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function InquiriesPage() {
  const router = useRouter();
  const { accessToken, isLoading, fetchWithAuth } = useAuth();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [items, setItems] = useState<InquiryResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildPath = useCallback(
    (targetPage: number) => {
      const params = new URLSearchParams({
        page: String(targetPage),
        size: String(PAGE_SIZE),
      });
      if (filter !== "ALL") params.set("status", filter);
      return "/api/members/me/inquiries?" + params.toString();
    },
    [filter],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWithAuth<InquiryListResponse>(buildPath(0));
      setItems(result.content);
      setPage(0);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "문의 내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [buildPath, fetchWithAuth]);

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) {
      router.replace("/login?redirect=/inquiries");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 인증 확정 및 필터 변경 후 서버 목록을 동기화한다.
    void load();
  }, [accessToken, isLoading, load, router]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await fetchWithAuth<InquiryListResponse>(buildPath(nextPage));
      setItems((current) => [...current, ...result.content]);
      setPage(nextPage);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "문의 내역을 더 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (isLoading || !accessToken) {
    return <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">문의 내역을 불러오는 중...</div>;
  }

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 py-8 sm:py-11">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold text-primary">고객지원</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-text-1 sm:text-[28px]">1:1 문의</h1>
          <p className="mt-2 text-sm text-text-3">접수한 문의와 답변을 한곳에서 확인하세요.</p>
        </div>
        <Link
          href="/inquiries/new"
          className={
            "inline-flex h-10 shrink-0 items-center justify-center rounded-r2 bg-primary px-4 text-sm font-extrabold text-white transition-colors hover:bg-primary-dark " +
            FOCUS_RING
          }
        >
          문의하기
        </Link>
      </header>

      <div className="mt-7 flex gap-2 overflow-x-auto border-b border-border pb-3" role="group" aria-label="문의 상태 필터">
        {FILTERS.map((item) => {
          const active = filter === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(item.value)}
              className={
                "h-9 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors " +
                FOCUS_RING +
                (active
                  ? " border-primary bg-primary text-white"
                  : " border-border-2 bg-surface text-text-2 hover:border-primary hover:text-primary")
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-r2 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-24 text-center text-sm text-text-3">불러오는 중...</p>
      ) : items.length === 0 ? (
        <section className="mt-5 flex min-h-[360px] flex-col items-center justify-center border-y border-border bg-surface-2/40 px-4 text-center text-text-3">
          <EmptyInquiryIcon />
          <p className="mt-4 text-base font-bold text-text-2">
            {filter === "ALL" ? "아직 문의 내역이 없어요" : "해당 상태의 문의가 없어요"}
          </p>
          <p className="mt-1 text-sm">궁금한 점이 있다면 문의하기를 이용해 주세요.</p>
          <Link
            href="/inquiries/new"
            className={
              "mt-5 inline-flex h-10 items-center rounded-r2 border border-border-2 bg-white px-4 text-sm font-bold text-text-2 hover:border-primary hover:text-primary " +
              FOCUS_RING
            }
          >
            새 문의 작성
          </Link>
        </section>
      ) : (
        <ul className="mt-5 overflow-hidden border-y border-border">
          {items.map((inquiry) => (
            <li key={inquiry.id} className="border-b border-border last:border-b-0">
              <Link
                href={"/inquiries/" + inquiry.id}
                className={"flex min-h-[96px] items-center gap-3 px-1 py-4 transition-colors hover:bg-surface-2/50 sm:px-4 " + FOCUS_RING}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">{INQUIRY_CATEGORY_LABEL[inquiry.category]}</span>
                    <span className="text-[11px] text-text-3">{formatInquiryDate(inquiry.createdAt)}</span>
                  </span>
                  <span className="mt-2 block truncate text-sm font-bold text-text-1 sm:text-[15px]">{inquiry.title}</span>
                  <span className="mt-1 block truncate text-xs text-text-3">{inquiry.content}</span>
                </span>
                <InquiryStatusBadge status={inquiry.status} />
                <span className="shrink-0 text-text-3">
                  <ChevronRight />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {page + 1 < totalPages && !loading && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className={
              "h-10 rounded-r2 border border-border-2 bg-white px-5 text-sm font-bold text-text-2 hover:border-primary hover:text-primary disabled:opacity-50 " +
              FOCUS_RING
            }
          >
            {loadingMore ? "불러오는 중..." : "더 보기"}
          </button>
        </div>
      )}

      <InquiryNotices />
    </main>
  );
}
