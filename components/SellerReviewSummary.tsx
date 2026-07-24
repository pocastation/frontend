"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { REVIEW_REPORT_REASON_LABEL, REVIEW_REPORT_REASON_OPTIONS } from "@/lib/labels";
import { formatRelativeTime } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type { ReviewReportReason, ReviewResponse, SellerRatingResponse, SellerReviewListResponse } from "@/lib/types";

const PAGE_SIZE = 5;

// 별점 문자열(★★★☆☆). aria로 점수를 읽어준다.
function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`tracking-tight text-[#f5b301] ${className}`} aria-label={`별점 ${value.toFixed(1)}점`}>
      {"★★★★★".slice(0, full)}
      <span className="text-border-2">{"★★★★★".slice(full)}</span>
    </span>
  );
}

// 경매 상세 판매자 카드의 리뷰 요약 — 평균 별점·건수·받은 매너 태그(공개 집계) + 펼쳐서 후기 목록.
// 판매자별 조회라 sellerId 기준. 비로그인도 조회 가능(집계·목록은 permitAll), 신고만 로그인 필요.
export default function SellerReviewSummary({ sellerId }: { sellerId: string }) {
  const { accessToken, fetchWithAuth } = useAuth();
  const [rating, setRating] = useState<SellerRatingResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<SellerRatingResponse>(`/api/sellers/${sellerId}/rating`, { cache: "no-store" });
        if (!cancelled) setRating(res);
      } catch {
        // 조회 실패 시 최소 표시(레벨 1·후기 0) — 카드 자체가 깨지지 않게 한다.
        if (!cancelled) {
          setRating({
            nickname: null,
            averageRating: null,
            reviewCount: 0,
            tags: [],
            trustLevel: 1,
            trustLevelLabel: "덕린이 🌱",
            tradeCount: 0,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const loadPage = useCallback(
    async (next: number) => {
      setLoadingList(true);
      try {
        const res = await apiFetch<SellerReviewListResponse>(
          `/api/sellers/${sellerId}/reviews?page=${next}&size=${PAGE_SIZE}`,
          { cache: "no-store" },
        );
        setReviews((prev) => (next === 0 ? res.content : [...prev, ...res.content]));
        setTotalPages(res.totalPages);
        setPage(next);
      } catch {
        // 목록 로드 실패는 조용히 — 요약(집계)은 이미 보여준 상태.
      } finally {
        setLoadingList(false);
      }
    },
    [sellerId],
  );

  function toggleExpand() {
    if (!expanded && reviews.length === 0) void loadPage(0);
    setExpanded((v) => !v);
  }

  if (!rating) {
    return <p className="mt-1.5 text-[11px] text-text-3">후기를 불러오는 중...</p>;
  }

  return (
    <div className="mt-2">
      {/* 신뢰 레벨(덕력 등급, §12.7) — 거래 경험 기반이라 리뷰가 0건이어도 표시한다. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-bold text-text-1">
          <span className="text-text-3">Lv.{rating.trustLevel}</span>
          {rating.trustLevelLabel}
        </span>
        {rating.tradeCount > 0 && (
          <span className="text-[11px] text-text-3">거래 {rating.tradeCount}회</span>
        )}
      </div>

      {/* 별점 + 후기 보기 + 매너 태그를 한 줄에(시안). 후기 0건이면 안내 문구만. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {rating.reviewCount === 0 ? (
          <span className="text-[11px] text-text-3">아직 받은 거래 후기가 없어요.</span>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <Stars value={rating.averageRating ?? 0} className="text-sm" />
              <span className="text-sm font-bold text-text-1">{(rating.averageRating ?? 0).toFixed(1)}</span>
            </span>
            <button
              type="button"
              onClick={toggleExpand}
              className={`rounded-r2 text-xs font-semibold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
            >
              거래 후기 {rating.reviewCount}개 {expanded ? "접기" : "보기"}
            </button>
          </>
        )}
        {rating.tags.length > 0 && (
          <>
            {rating.reviewCount > 0 && <span className="h-3 w-px bg-border" aria-hidden="true" />}
            {rating.tags.map((t) => (
              <span
                key={t.code}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-text-2"
              >
                {t.label}
                <span className="text-text-3">{t.count}</span>
              </span>
            ))}
          </>
        )}
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col divide-y divide-border/70 border-t border-border/70">
          {reviews.map((r) => (
            <ReviewRow key={r.id} review={r} canReport={!!accessToken} fetchWithAuth={fetchWithAuth} />
          ))}
          {page + 1 < totalPages && (
            <button
              type="button"
              onClick={() => loadPage(page + 1)}
              disabled={loadingList}
              className={`mt-2 rounded-r2 py-2 text-xs font-semibold text-text-3 transition-colors hover:text-primary disabled:opacity-50 ${FOCUS_RING}`}
            >
              {loadingList ? "불러오는 중..." : "후기 더 보기"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  review,
  canReport,
  fetchWithAuth,
}: {
  review: ReviewResponse;
  canReport: boolean;
  fetchWithAuth: <T>(path: string, options?: { method?: string; body?: unknown }) => Promise<T>;
}) {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReviewReportReason>("ABUSE");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReport() {
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/reviews/${review.id}/reports`, {
        method: "POST",
        body: { reasonCode: reason, detail: null },
      });
      setDone(true);
      setReporting(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "신고를 접수하지 못했어요.");
    }
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Stars value={review.rating} className="text-xs" />
          <span className="text-xs font-bold text-text-1">{review.reviewerNickname ?? "구매자"}</span>
        </div>
        <span className="text-[11px] text-text-3">{formatRelativeTime(review.createdAt)}</span>
      </div>

      {review.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {review.tags.map((t) => (
            <span key={t.code} className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-semibold text-text-2">
              {t.label}
            </span>
          ))}
        </div>
      )}

      {review.body && <p className="mt-1.5 whitespace-pre-wrap text-xs text-text-2">{review.body}</p>}

      {canReport && !done && (
        <div className="mt-2">
          {reporting ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReviewReportReason)}
                className={`rounded-r2 border border-border-2 bg-surface px-2 py-1 text-[11px] text-text-2 ${FOCUS_RING}`}
              >
                {REVIEW_REPORT_REASON_OPTIONS.map((code) => (
                  <option key={code} value={code}>
                    {REVIEW_REPORT_REASON_LABEL[code]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={submitReport}
                className={`rounded-r2 bg-text-1 px-2 py-1 text-[11px] font-bold text-white ${FOCUS_RING}`}
              >
                신고 접수
              </button>
              <button
                type="button"
                onClick={() => setReporting(false)}
                className={`rounded-r2 px-1.5 py-1 text-[11px] font-semibold text-text-3 ${FOCUS_RING}`}
              >
                취소
              </button>
              {error && <span className="text-[11px] font-semibold text-accent">{error}</span>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setReporting(true)}
              className={`text-[11px] font-semibold text-text-3 transition-colors hover:text-accent ${FOCUS_RING}`}
            >
              신고
            </button>
          )}
        </div>
      )}
      {done && <p className="mt-2 text-[11px] font-semibold text-text-3">신고가 접수됐어요. 검토 후 처리돼요.</p>}
    </div>
  );
}
