"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW, formatTimeLeft } from "@/lib/format";
import {
  AUCTION_SALE_TYPE_BADGE_CLASS,
  AUCTION_SALE_TYPE_LABEL,
  AUCTION_STATUS_BADGE_CLASS,
  AUCTION_STATUS_LABEL,
} from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminAuctionListResponse, AdminAuctionSummary, AuctionSaleType, AuctionStatus } from "@/lib/types";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

const STATUS_FILTERS: { key: AuctionStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "LIVE", label: "진행 중" },
  { key: "ENDED_SOLD", label: "낙찰 종료" },
  { key: "ENDED_NO_BIDS", label: "유찰" },
  { key: "CANCELLED", label: "취소됨" },
];

const SALE_TYPE_FILTERS: { key: AuctionSaleType | "ALL"; label: string }[] = [
  { key: "ALL", label: "전체 판매" },
  { key: "AUCTION", label: "경매판매" },
  { key: "INSTANT", label: "즉시판매" },
];

function buildParams(q: string, status: AuctionStatus | "ALL", saleType: AuctionSaleType | "ALL", page: number) {
  const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(page) });
  if (q.trim()) params.set("q", q.trim());
  if (status !== "ALL") params.set("status", status);
  if (saleType !== "ALL") params.set("saleType", saleType);
  return params;
}

export default function AdminAuctionsPage() {
  const { fetchWithAuth } = useAuth();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuctionStatus | "ALL">("ALL");
  const [saleTypeFilter, setSaleTypeFilter] = useState<AuctionSaleType | "ALL">("ALL");
  const [auctions, setAuctions] = useState<AdminAuctionSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<AdminAuctionSummary | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const isFirstRun = useRef(true);

  const fetchList = useCallback(
    async (q: string, status: AuctionStatus | "ALL", saleType: AuctionSaleType | "ALL") => {
      setLoading(true);
      try {
        const res = await fetchWithAuth<AdminAuctionListResponse>(
          `/api/admin/auctions?${buildParams(q, status, saleType, 0)}`,
        );
        setAuctions(res.content);
        setPage(0);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      } catch {
        // 목록 조회 실패는 조용히 무시하고 직전 목록 유지.
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth],
  );

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      void fetchList("", "ALL", "ALL");
      return;
    }
    const timer = setTimeout(() => void fetchList(query, statusFilter, saleTypeFilter), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, statusFilter, saleTypeFilter, fetchList]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetchWithAuth<AdminAuctionListResponse>(
        `/api/admin/auctions?${buildParams(query, statusFilter, saleTypeFilter, nextPage)}`,
      );
      setAuctions((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch {
      // 더보기 실패는 이미 보이는 목록 유지.
    } finally {
      setLoadingMore(false);
    }
  }

  function openCancelDialog(auction: AdminAuctionSummary) {
    setCancelTarget(auction);
    setReason("");
    setNotice(null);
  }

  async function confirmCancel() {
    if (!cancelTarget || submitting) return;
    if (!reason.trim()) {
      setNotice({ kind: "error", text: "취소 사유를 입력해주세요." });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await fetchWithAuth<void>(`/api/admin/auctions/${cancelTarget.id}/cancel`, {
        method: "PATCH",
        body: { reason: reason.trim() },
      });
      setNotice({ kind: "success", text: `"${cancelTarget.title}"을(를) 취소했습니다.` });
      setCancelTarget(null);
      await fetchList(query, statusFilter, saleTypeFilter);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "취소에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  function getEndLabel(auction: AdminAuctionSummary) {
    if (auction.saleType === "INSTANT") {
      return auction.status === "LIVE" ? "판매 중" : "—";
    }
    return auction.status === "LIVE" && auction.endAt ? formatTimeLeft(auction.endAt) : "—";
  }

  const hasMore = page + 1 < totalPages;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">경매 관리</h1>
      <p className="mt-1.5 text-sm text-text-3">경매를 조회하고 부적절한 매물을 취소할 수 있습니다.</p>

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-4 rounded-r2 px-4 py-3 text-sm font-semibold ${
            notice.kind === "error" ? "bg-accent-soft text-accent" : "bg-ok-soft text-ok"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="mt-5 mb-3 flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-full border border-border px-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-3" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="sr-only">경매 제목 검색</span>
          <input
            type="search"
            placeholder="경매 제목 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border-0 bg-transparent text-[13.5px] text-text-1 outline-none placeholder:text-text-3"
          />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="상태 필터">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={statusFilter === f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`h-10 rounded-full border px-3 text-xs font-bold transition-colors ${FOCUS_RING} ${
                statusFilter === f.key ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:border-primary hover:text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="판매 유형 필터">
          {SALE_TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={saleTypeFilter === f.key}
              onClick={() => setSaleTypeFilter(f.key)}
              className={`h-10 rounded-full border px-3 text-xs font-bold transition-colors ${FOCUS_RING} ${
                saleTypeFilter === f.key ? "border-text-1 bg-text-1 text-white" : "border-border text-text-2 hover:border-primary hover:text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-2 text-xs text-text-3">총 {totalElements}건{loading && " · 불러오는 중..."}</p>

      <div className="overflow-x-auto rounded-r3 border border-border bg-surface shadow-card">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold text-text-3">
              <th className="px-4 py-2.5">경매</th>
              <th className="px-4 py-2.5">유형</th>
              <th className="px-4 py-2.5">판매자</th>
              <th className="px-4 py-2.5">현재가</th>
              <th className="px-4 py-2.5">입찰</th>
              <th className="px-4 py-2.5">상태</th>
              <th className="px-4 py-2.5">마감</th>
              <th className="px-4 py-2.5">관리</th>
            </tr>
          </thead>
          <tbody>
            {auctions.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-text-3">
                  {query ? "검색 결과가 없습니다." : "경매가 없습니다."}
                </td>
              </tr>
            ) : (
              auctions.map((a) => (
                <tr key={a.id} className={`border-b border-border text-[13px] last:border-0 ${a.status === "CANCELLED" ? "bg-accent-soft/30" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/auctions/${a.id}`} className={`flex items-center gap-2.5 ${FOCUS_RING}`}>
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-r1 bg-surface-2">
                        {a.representativeThumbnailUrl && (
                          // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
                          <img src={mediaUrl(a.representativeThumbnailUrl)} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0">
                        {a.artistName && <span className="block truncate text-[11px] font-bold text-primary">{a.artistName}</span>}
                        <span className="block max-w-[200px] truncate font-bold text-text-1">{a.title}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${AUCTION_SALE_TYPE_BADGE_CLASS[a.saleType]}`}>
                      {AUCTION_SALE_TYPE_LABEL[a.saleType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-2">{a.sellerNickname ?? "—"}</td>
                  <td className="px-4 py-3 font-display font-bold text-text-1">{formatKRW(a.currentPrice)}</td>
                  <td className="px-4 py-3 text-text-2">{a.saleType === "INSTANT" ? "즉시구매" : `${a.bidCount}회`}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${AUCTION_STATUS_BADGE_CLASS[a.status]}`}>
                      {AUCTION_STATUS_LABEL[a.status]}
                    </span>
                    {a.status === "CANCELLED" && a.cancellationReason && (
                      <span className="mt-1 block text-[10.5px] text-text-3">사유: {a.cancellationReason}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-3">{getEndLabel(a)}</td>
                  <td className="px-4 py-3">
                    {a.status === "LIVE" ? (
                      <button
                        type="button"
                        onClick={() => openCancelDialog(a)}
                        className={`rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-bold text-accent transition-colors hover:bg-accent hover:text-white ${FOCUS_RING}`}
                      >
                        취소
                      </button>
                    ) : (
                      <span className="text-xs text-text-3">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={`h-10 rounded-full border border-border-2 bg-white px-5 text-[13px] font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-60 ${FOCUS_RING}`}
          >
            {loadingMore ? "불러오는 중..." : "더 보기"}
          </button>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-r3 bg-surface p-5 shadow-modal">
            <h2 className="font-display text-base font-extrabold text-text-1">경매 취소</h2>
            <p className="mt-1.5 text-[13px] text-text-3">
              &quot;{cancelTarget.title}&quot;을(를) 취소합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <label className="sr-only" htmlFor="cancel-reason">취소 사유</label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="취소 사유를 입력하세요."
              rows={3}
              autoFocus
              className={`mt-3 w-full resize-none rounded-r2 border border-border px-3 py-2 text-[13px] outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={submitting}
                className={`h-10 flex-1 rounded-r2 border border-border-2 bg-white text-sm font-bold text-text-2 transition-colors hover:border-primary disabled:opacity-60 ${FOCUS_RING}`}
              >
                닫기
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={submitting}
                className={`h-10 flex-1 rounded-r2 bg-accent text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS_RING}`}
              >
                {submitting ? "처리 중..." : "취소 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
