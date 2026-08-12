"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuctionVerificationReviewDialog from "@/components/AuctionVerificationReviewDialog";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW, formatTimeLeft } from "@/lib/format";
import {
  AUCTION_CANCELLATION_REASON_OPTIONS,
  AUCTION_SALE_TYPE_LABEL,
  AUCTION_STATUS_TONE,
  AUCTION_STATUS_LABEL,
} from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type {
  AdminAuctionListResponse,
  AdminAuctionSummary,
  AuctionCancellationReasonCode,
  AuctionSaleType,
  AuctionStatus,
} from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

const STATUS_FILTERS: { key: AuctionStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "PENDING_REVIEW", label: "검수 대기" },
  { key: "LIVE", label: "진행 중" },
  { key: "ENDED_SOLD", label: "낙찰 종료" },
  { key: "ENDED_NO_BIDS", label: "유찰" },
  { key: "REJECTED", label: "승인 거절" },
  { key: "CANCELLED", label: "취소됨" },
];
const PUBLIC_AUCTION_STATUSES = new Set<AuctionStatus>([
  "LIVE",
  "ENDED_SOLD",
  "ENDED_NO_BIDS",
  "CANCELLED",
]);

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

function AuctionIdentity({ auction }: { auction: AdminAuctionSummary }) {
  return (
    <>
      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-r1 bg-surface-2">
        {auction.representativeThumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
          <img src={mediaUrl(auction.representativeThumbnailUrl)} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0">
        {auction.artistName && <span className="block truncate text-[11px] font-bold text-primary">{auction.artistName}</span>}
        {/* 제목의 max-w-[200px]를 걷어냈다(#291) — 980px 표에서 가장 중요한 정보에 가장 좁은 칸을
            주고 있었다. 지면이 1720까지 넓어진 만큼 그 여유를 제목이 쓴다. */}
        <span className="block truncate font-bold text-text-1">{auction.title}</span>
        {/* 유형을 컬럼에서 여기로 내렸다 — 두세 글자짜리 값에 컬럼 하나를 주는 것보다,
            제목을 읽을 때 함께 읽히는 편이 낫다. 정보는 사라지지 않는다. */}
        <span className="block text-[11px] text-text-3">{AUCTION_SALE_TYPE_LABEL[auction.saleType]}</span>
      </span>
    </>
  );
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
  const [reviewTarget, setReviewTarget] = useState<AdminAuctionSummary | null>(null);
  const [reasonCode, setReasonCode] = useState<AuctionCancellationReasonCode | "">("");
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
      // 대시보드의 "최근 등록 경매"가 검수 대기 건을 이 목록으로 보낼 때 필터를 실어 보낸다
      // (?status=PENDING_REVIEW). 알 수 없는 값이면 무시하고 전체로 연다.
      const requested = new URLSearchParams(window.location.search).get("status");
      const initial = requested && STATUS_FILTERS.some((f) => f.key === requested)
        ? (requested as AuctionStatus | "ALL")
        : "ALL";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 쿼리는 마운트 후에만 읽을 수 있다(마이페이지 ?tab=과 같은 패턴).
      if (initial !== "ALL") setStatusFilter(initial);
      void fetchList("", initial, "ALL");
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
    setReasonCode("");
    setNotice(null);
  }

  async function confirmCancel() {
    if (!cancelTarget || submitting) return;
    if (!reasonCode) {
      setNotice({ kind: "error", text: "취소 사유를 선택해주세요." });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await fetchWithAuth<void>(`/api/admin/auctions/${cancelTarget.id}/cancel`, {
        method: "PATCH",
        body: { reasonCode },
      });
      setNotice({
        kind: "success",
        text: `"${cancelTarget.title}"을(를) 취소했습니다. 판매자에게 사유가 전달됐습니다.`,
      });
      setCancelTarget(null);
      await fetchList(query, statusFilter, saleTypeFilter);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "취소에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  async function completeReview(message: string) {
    setReviewTarget(null);
    setNotice({ kind: "success", text: message });
    await fetchList(query, statusFilter, saleTypeFilter);
  }

  // 홈 배너(Hero) 노출 토글(#150) — 배너는 단일 슬롯이라 새로 켜면 기존 지정이 자동 해제된다.
  // 홈 배너 조회는 '진행 중인 경매' 매물만 대상이라 즉시판매는 애초에 지정할 수 없다(서버도 409로 막는다).
  async function toggleFeatured(auction: AdminAuctionSummary) {
    try {
      await fetchWithAuth<void>(`/api/admin/auctions/${auction.id}/featured`, {
        method: "PATCH",
        body: { featured: !auction.featured },
      });
      setNotice({
        kind: "success",
        text: auction.featured
          ? `"${auction.title}"을(를) 홈 배너에서 내렸습니다.`
          : `"${auction.title}"을(를) 홈 배너로 지정했습니다. 기존 배너 지정은 해제됩니다.`,
      });
      await fetchList(query, statusFilter, saleTypeFilter);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "배너 설정에 실패했습니다." });
    }
  }

  function getEndLabel(auction: AdminAuctionSummary) {
    if (auction.saleType === "INSTANT") {
      return auction.status === "LIVE" ? "판매 중" : "—";
    }
    return auction.status === "LIVE" && auction.endAt ? formatTimeLeft(auction.endAt) : "—";
  }

  const hasMore = page + 1 < totalPages;
  const selectedCancelReason =
    AUCTION_CANCELLATION_REASON_OPTIONS.find((option) => option.code === reasonCode) ?? null;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">경매 관리</h1>
      <p className="mt-1.5 text-sm text-text-3">인증사진을 검수해 경매를 승인하거나 거절하고, 공개된 매물을 관리합니다.</p>

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

      <div className="overflow-x-auto rounded-r3 border border-border bg-surface">
        {/* 유형 컬럼을 제목 아래로 내려 8열 → 7열, 최소폭 980 → 900(#291).
            지면 상한이 1720이라 1440 모니터에서 콘텐츠 1164px — 이제 여유가 264px 있다. */}
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold text-text-3">
              <th className="whitespace-nowrap px-4 py-2.5">경매</th>
              <th className="whitespace-nowrap px-4 py-2.5">판매자</th>
              <th className="whitespace-nowrap px-4 py-2.5">현재가</th>
              <th className="whitespace-nowrap px-4 py-2.5">입찰</th>
              <th className="whitespace-nowrap px-4 py-2.5">상태</th>
              <th className="whitespace-nowrap px-4 py-2.5">마감</th>
              <th className="whitespace-nowrap px-4 py-2.5">관리</th>
            </tr>
          </thead>
          <tbody>
            {auctions.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-3">
                  {query ? "검색 결과가 없습니다." : "경매가 없습니다."}
                </td>
              </tr>
            ) : (
              // 행 전체를 파스텔로 칠하던 것을 첫 칸의 좌측 규칙선으로 바꿨다(#294).
              // 같은 정보를 주면서 색 면적은 2px로 줄고, 하드코딩 주황도 사라진다.
              auctions.map((a) => (
                <tr key={a.id} className="border-b border-border text-[13px] last:border-0">
                  <td
                    className={`px-4 py-3 ${
                      a.status === "PENDING_REVIEW"
                        ? "border-l-2 border-l-[var(--color-star-line)]"
                        : a.status === "REJECTED" || a.status === "CANCELLED"
                          ? "border-l-2 border-l-accent"
                          : "border-l-2 border-l-transparent"
                    }`}
                  >
                    {a.status === "PENDING_REVIEW" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewTarget(a);
                          setNotice(null);
                        }}
                        className={`flex w-full items-center gap-2.5 text-left ${FOCUS_RING}`}
                      >
                        <AuctionIdentity auction={a} />
                      </button>
                    ) : PUBLIC_AUCTION_STATUSES.has(a.status) ? (
                      <Link href={`/auctions/${a.id}`} className={`flex items-center gap-2.5 ${FOCUS_RING}`}>
                        <AuctionIdentity auction={a} />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <AuctionIdentity auction={a} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-2">{a.sellerNickname ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-display font-bold text-text-1">{formatKRW(a.currentPrice)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-2">{a.saleType === "INSTANT" ? "즉시구매" : `${a.bidCount}회`}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={AUCTION_STATUS_TONE[a.status]}>
                      {AUCTION_STATUS_LABEL[a.status]}
                    </StatusBadge>
                    {a.status === "CANCELLED" && a.cancellationReason && (
                      <span className="mt-1 block text-[10.5px] text-text-3">사유: {a.cancellationReason}</span>
                    )}
                    {a.status === "REJECTED" && a.reviewReason && (
                      <span className="mt-1 block text-[10.5px] text-text-3">사유: {a.reviewReason}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-3">{getEndLabel(a)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {a.status === "PENDING_REVIEW" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewTarget(a);
                          setNotice(null);
                        }}
                        // 하드코딩 주황 3색을 별빛 골드 토큰으로(#294). 배경 필 대신 테두리로 —
                        // 조치 버튼이 상태 배지보다 강해 보이면 안 된다.
                        className={`rounded-full border border-[var(--color-star-line)] px-3 py-1 text-xs font-bold text-[var(--color-star-ink)] transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
                      >
                        검수
                      </button>
                    ) : a.status === "LIVE" ? (
                      <div className="flex items-center gap-1.5">
                        {/* 즉시판매는 홈 배너 대상이 아니다(홈 조회가 경매 매물만 본다) — 눌러도 안 되는 버튼 대신
                            비활성 상태로 이유를 노출한다. */}
                        <button
                          type="button"
                          onClick={() => void toggleFeatured(a)}
                          disabled={a.saleType !== "AUCTION"}
                          aria-pressed={a.featured}
                          title={
                            a.saleType === "AUCTION"
                              ? "홈 배너 노출 토글 (배너는 한 건만 지정됩니다)"
                              : "홈 배너에는 경매 매물만 지정할 수 있습니다"
                          }
                          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING} ${
                            a.featured
                              ? "border-primary text-primary hover:bg-primary/5"
                              : "border-border-2 text-text-3 hover:border-primary hover:text-primary"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${a.featured ? "bg-primary" : "bg-border-2"}`}
                            aria-hidden="true"
                          />
                          배너
                        </button>
                        <button
                          type="button"
                          onClick={() => openCancelDialog(a)}
                          className={`rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-bold text-accent transition-colors hover:bg-accent hover:text-white ${FOCUS_RING}`}
                        >
                          취소
                        </button>
                      </div>
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

      {reviewTarget && (
        <AuctionVerificationReviewDialog
          auction={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onReviewed={completeReview}
        />
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-r3 bg-surface p-5 shadow-modal">
            <h2 className="font-display text-base font-extrabold text-text-1">경매 취소</h2>
            <p className="mt-1.5 text-[13px] text-text-3">
              &quot;{cancelTarget.title}&quot;을(를) 취소합니다. 이 작업은 되돌릴 수 없고, 선택한 사유가 판매자에게 알림으로 전달됩니다.
            </p>
            {/* 사유는 템플릿 선택 — 검수 거절과 같은 이유(문구 일관성·집계). */}
            <fieldset className="mt-3">
              <legend className="sr-only">취소 사유</legend>
              <div className="grid gap-1.5">
                {AUCTION_CANCELLATION_REASON_OPTIONS.map((option) => (
                  <label
                    key={option.code}
                    className={`flex cursor-pointer items-center gap-2 rounded-r2 border px-3 py-2 text-[13px] transition-colors ${
                      reasonCode === option.code
                        ? "border-accent bg-accent-soft font-bold text-accent"
                        : "border-border text-text-2 hover:border-text-2"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={option.code}
                      checked={reasonCode === option.code}
                      onChange={() => setReasonCode(option.code)}
                      className="h-3.5 w-3.5 shrink-0 accent-[var(--color-accent)]"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {selectedCancelReason && (
                <p className="mt-3 border-l-2 border-border-2 bg-surface-2 px-3 py-2 text-[12px] leading-5 text-text-2">
                  <span className="font-extrabold text-text-3">판매자에게 전달될 문구 · </span>
                  {selectedCancelReason.preview}
                </p>
              )}
            </fieldset>
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
