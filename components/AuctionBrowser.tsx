"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AuctionCard from "@/components/AuctionCard";
import { SORT_OPTIONS, type SortKey } from "@/components/AuctionExplorer";
import { CardSkeletonGrid, ExploreEmpty, ExploreError, InlineSpinner } from "@/components/explore-states";
import { apiFetch } from "@/lib/api";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionListResponse, AuctionResponse, AuctionSaleType } from "@/lib/types";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const DEFAULT_SORT: SortKey = "latest";
const GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(min(210px,100%),1fr))] gap-3.5";

function buildParams(query: string, sort: SortKey, page: number, saleType: AuctionSaleType) {
  const params = new URLSearchParams({ saleType, sort, size: String(PAGE_SIZE), page: String(page) });
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
}: {
  initialAuctions: AuctionResponse[];
  initialTotalElements: number;
  initialTotalPages: number;
  saleType?: AuctionSaleType;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [auctions, setAuctions] = useState(initialAuctions);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(initialTotalElements);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const isFirstRun = useRef(true);
  const { wishlisted, toggle } = useWishlistStatus(auctions.map((a) => a.id));

  // 검색어·정렬이 바뀌면 첫 페이지부터 다시 조회(목록 전체 교체).
  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch<AuctionListResponse>(`/api/auctions?${buildParams(query, sort, 0, saleType)}`, {
        cache: "no-store",
      });
      setAuctions(res.content);
      setPage(0);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [query, saleType, sort]);

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
      const res = await apiFetch<AuctionListResponse>(`/api/auctions?${buildParams(query, sort, nextPage, saleType)}`, {
        cache: "no-store",
      });
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
  const searchPlaceholder = saleType === "INSTANT"
    ? "즉시판매 제목, 아티스트명, 멤버명으로 검색"
    : "경매 제목, 아티스트명, 멤버명으로 검색";
  const emptyTitle = saleType === "INSTANT" ? "등록된 즉시판매가 없습니다" : "진행 중인 경매가 없습니다";

  return (
    <div>
      <label className="mb-5 flex h-11 max-w-[480px] items-center gap-2 rounded-full border border-border px-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-3" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="sr-only">{searchPlaceholder}</span>
        <input
          type="search"
          placeholder={searchPlaceholder}
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
          {SORT_OPTIONS.map((option) => (
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

      {loading ? (
        <div className={GRID_CLASS}>
          <CardSkeletonGrid count={10} variant="auction" />
        </div>
      ) : auctions.length === 0 ? (
        error ? null : (
          <ExploreEmpty
            title={query ? `"${query}" 검색 결과가 없어요` : emptyTitle}
            hint={query ? "다른 키워드로 검색하거나 정렬을 바꿔보세요." : undefined}
            onClear={query ? () => setQuery("") : undefined}
          />
        )
      ) : (
        <div className={`${GRID_CLASS} ${error ? "opacity-45" : ""}`}>
          {auctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              wishlisted={wishlisted.has(auction.id)}
              onToggleWishlist={(next) => toggle(auction.id, next)}
            />
          ))}
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
