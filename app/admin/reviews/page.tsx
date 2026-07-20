"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTimeKST } from "@/lib/format";
import { REVIEW_REPORT_REASON_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminReviewReportResponse } from "@/lib/types";

// 별점 표시(★ 채움).
function Stars({ value }: { value: number }) {
  return (
    <span className="text-[#f5b301]" aria-label={`별점 ${value}점`}>
      {"★★★★★".slice(0, value)}
      <span className="text-border-2">{"★★★★★".slice(value)}</span>
    </span>
  );
}

// 리뷰 신고 관리(§9.2-1) — 미처리 신고가 있는 리뷰를 보고, 블라인드(집계·목록 제외)/반려한다.
// 블라인드된 리뷰는 해제할 수 있다.
export default function AdminReviewsPage() {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<AdminReviewReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchWithAuth<AdminReviewReportResponse[]>("/api/admin/reviews/reports"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "신고 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 서버 데이터 동기화(다른 admin 페이지와 동일 패턴).
    void load();
  }, [load]);

  async function act(reviewId: number, path: string, body?: unknown) {
    setBusyId(reviewId);
    try {
      await fetchWithAuth<void>(`/api/admin/reviews/${reviewId}/${path}`, { method: "POST", body });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-extrabold text-text-1">리뷰 신고</h1>
      <p className="mt-1 text-sm text-text-3">신고된 거래 후기를 검토하고 블라인드/반려해요.</p>

      {error && (
        <p role="alert" className="mt-4 rounded-r2 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-text-3">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-text-3">처리할 리뷰 신고가 없어요.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.reviewId} className="rounded-r3 border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stars value={item.rating} />
                  <span className="text-xs text-text-3">
                    {item.reviewerNickname ?? "구매자"} → {item.sellerNickname ?? "판매자"}
                  </span>
                  {item.reviewStatus === "BLINDED" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      블라인드됨
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-text-3">{formatDateTimeKST(item.reviewCreatedAt)}</span>
              </div>

              {item.body ? (
                <p className="mt-2 whitespace-pre-wrap rounded-r2 bg-surface-2/50 px-3 py-2 text-sm text-text-2">
                  {item.body}
                </p>
              ) : (
                <p className="mt-2 text-xs italic text-text-3">본문 없음 (별점·태그만)</p>
              )}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.reports.map((rep, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-text-2"
                    title={rep.detail ?? undefined}
                  >
                    {REVIEW_REPORT_REASON_LABEL[rep.reasonCode]}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.reviewStatus === "BLINDED" ? (
                  <button
                    type="button"
                    disabled={busyId === item.reviewId}
                    onClick={() => act(item.reviewId, "unblind")}
                    className={`rounded-r2 border border-border-2 bg-surface px-3 py-1.5 text-xs font-bold text-text-2 transition-colors hover:border-text-3 disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    블라인드 해제
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busyId === item.reviewId}
                      onClick={() => act(item.reviewId, "blind", { reason: "신고 검토 후 블라인드" })}
                      className={`rounded-r2 bg-accent px-3 py-1.5 text-xs font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      블라인드
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.reviewId}
                      onClick={() => act(item.reviewId, "dismiss-reports")}
                      className={`rounded-r2 border border-border-2 bg-surface px-3 py-1.5 text-xs font-bold text-text-2 transition-colors hover:border-text-3 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      반려 (정상 리뷰)
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
