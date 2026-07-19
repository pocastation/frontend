"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AuctionCard from "@/components/AuctionCard";
import { SORT_OPTIONS, type SortKey } from "@/components/AuctionExplorer";
import { ExploreEmpty, ExploreError, InlineSpinner } from "@/components/explore-states";
import { apiFetch } from "@/lib/api";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionListResponse, AuctionResponse, AuctionSaleType } from "@/lib/types";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
// 모바일은 2열(카드가 화면폭을 꽉 채우지 않게), sm 이상은 auto-fill로 데스크탑 밀도 유지.
const GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(min(210px,100%),1fr))]";

// 종료 목록 엔드포인트(/api/auctions/ended)는 saleType 파라미터를 받지 않으므로(항상 AUCTION),
// 진행중 목록일 때만 saleType을 붙인다.
function buildParams(
  query: string,
  sort: SortKey,
  page: number,
  saleType: AuctionSaleType,
  includeSaleType: boolean,
) {
  const params = new URLSearchParams({ sort, size: String(PAGE_SIZE), page: String(page) });
  if (includeSaleType) params.set("saleType", saleType);
  if (query.trim()) params.set("q", query.trim());
  return params;
}

// 홈 화면 임베드(AuctionExplorer)와 달리 /auctions 전용 페이지 — 검색은 헤더 전역검색과
// 별개의 로컬 입력(ArtistExplorer와 같은 이유: 헤더검색은 홈으로 리다이렉트하므로 이 페이지
// 안에서 바로 필터링되려면 독립된 입력이 필요)이고, 결과는 60건 전체로드가 아니라 "더보기"로
// 누적한다(ArtistExplorer와 같은 페이지네이션 패턴 재사용, 사이트 전체 일관성).
export default function AuctionBrowser({
  initialAuctions,
  initialTotalElements,
  initialTotalPages,
  saleType = "AUCTION",
  initialQuery = "",
  endpoint = "/api/auctions",
  sortOptions = SORT_OPTIONS,
  defaultSort = "latest",
  emptyTitle,
  searchPlaceholder,
}: {
  initialAuctions: AuctionResponse[];
  initialTotalElements: number;
  initialTotalPages: number;
  saleType?: AuctionSaleType;
  initialQuery?: string;
  // 종료 목록(/api/auctions/ended)처럼 다른 엔드포인트·정렬옵션을 쓰는 목록도 이 컴포넌트를 재사용한다.
  endpoint?: string;
  sortOptions?: readonly { key: SortKey; label: string }[];
  defaultSort?: SortKey;
  emptyTitle?: string;
  searchPlaceholder?: string;
}) {
  // 종료 목록은 saleType 파라미터가 없다(엔드포인트가 AUCTION 고정) — 진행중 목록에서만 붙인다.
  const includeSaleType = endpoint === "/api/auctions";
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>(defaultSort);
  const [auctions, setAuctions] = useState(initialAuctions);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(initialTotalElements);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const isFirstRun = useRef(true);
  // 빠른 연속 정렬/검색 시 옛 응답이 최신 결과를 덮어쓰는 걸 막는 요청 시퀀스 가드.
  const reqIdRef = useRef(0);
  const { wishlisted, toggle } = useWishlistStatus(auctions.map((a) => a.id));

  // 검색어·정렬이 바뀌면 첫 페이지부터 다시 조회(목록 전체 교체).
  const fetchFirstPage = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch<AuctionListResponse>(
        `${endpoint}?${buildParams(query, sort, 0, saleType, includeSaleType)}`,
        { cache: "no-store" },
      );
      if (reqId !== reqIdRef.current) return; // 더 최신 요청에 밀렸으면 무시
      setAuctions(res.content);
      setPage(0);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setError(true);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [query, saleType, sort, endpoint, includeSaleType]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const timer = setTimeout(fetchFirstPage, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fetchFirstPage]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const res = await apiFetch<AuctionListResponse>(
        `${endpoint}?${buildParams(query, sort, nextPage, saleType, includeSaleType)}`,
        { cache: "no-store" },
      );
      setAuctions((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = page + 1 < totalPages;
  const resolvedPlaceholder = searchPlaceholder ?? (saleType === "INSTANT"
    ? "즉시판매 제목, 스타명, 멤버명으로 검색"
    : "경매 제목, 스타명, 멤버명으로 검색");
  const resolvedEmptyTitle = emptyTitle ?? (saleType === "INSTANT" ? "등록된 즉시판매가 없습니다" : "진행 중인 경매가 없습니다");

  return (
    <div>
      <label className="mb-5 flex h-11 max-w-[480px] items-center gap-2 rounded-full border border-border px-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-3" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="sr-only">{resolvedPlaceholder}</span>
        <input
          type="search"
          placeholder={resolvedPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border-0 bg-transparent text-[13.5px] text-text-1 outline-none placeholder:text-text-3"
        />
      </label>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs text-text-3">
          <span>
            총 <strong className="font-bold text-text-1">{totalElements}</strong>개
          </span>
          {loading && <InlineSpinner />}
        </span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="정렬 기준">
          {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={sort === option.key}
              onClick={() => setSort(option.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${FOCUS_RING} ${
                sort === option.key
                  ? "border-primary bg-primary text-white"
                  : "border-border text-text-2 hover:border-primary hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ExploreError onRetry={fetchFirstPage} />
        </div>
      )}

      {auctions.length > 0 ? (
        // 재정렬·재검색 중에도 기존 카드를 유지하고 dim만 준다(스켈레톤으로 통째 교체 X).
        <div className={`${GRID_CLASS} transition-opacity ${loading ? "opacity-60" : error ? "opacity-45" : ""}`}>
          {auctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              wishlisted={wishlisted.has(auction.id)}
              onToggleWishlist={(next) => toggle(auction.id, next)}
            />
          ))}
        </div>
      ) : error ? null : (
        // 빈 목록도 로딩 중 높이가 다른 스피너로 교체하지 않고 dim만(레이아웃 시프트 방지).
        <div className={loading ? "opacity-60 transition-opacity" : undefined}>
          <ExploreEmpty
            title={query ? `"${query}" 검색 결과가 없어요` : resolvedEmptyTitle}
            hint={query ? "다른 키워드로 검색하거나 정렬을 바꿔보세요." : undefined}
            onClear={query ? () => setQuery("") : undefined}
          />
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-8 flex flex-col items-center gap-2">
          {moreError && (
            <p className="text-xs font-semibold text-accent">더 불러오지 못했어요. 다시 시도해 주세요.</p>
          )}
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={`flex h-11 items-center gap-2 rounded-full border border-border-2 bg-white px-6 text-[13.5px] font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
          >
            {loadingMore ? "불러오는 중..." : moreError ? "다시 시도" : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
