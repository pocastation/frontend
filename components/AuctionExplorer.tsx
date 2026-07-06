"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import AuctionCard from "@/components/AuctionCard";
import { CardSkeletonGrid, ExploreEmpty, ExploreError, InlineSpinner } from "@/components/explore-states";
import { apiFetch } from "@/lib/api";
import { useSearch } from "@/lib/search-context";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionListResponse, AuctionResponse } from "@/lib/types";

// /auctions 전용 페이지(AuctionBrowser)도 같은 정렬 기준을 쓰므로 여기서 export해 재사용한다.
export type SortKey = "latest" | "popular" | "views" | "price_asc" | "price_desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "popular", label: "인기순" },
  { key: "views", label: "조회순" },
  { key: "price_asc", label: "낮은 가격" },
  { key: "price_desc", label: "높은 가격" },
];

const DEFAULT_SORT: SortKey = "latest";
const DEBOUNCE_MS = 300;
const GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(min(210px,100%),1fr))] gap-3.5";

// 검색·정렬을 서버가 처리한다(§B1) — 목록 전체를 한 번에 받아 클라이언트에서 거르던 이전
// 방식은 매물이 늘면 안 맞아 폐기. 초기 진입은 서버컴포넌트(page.tsx)가 이미 기본값(검색어
// 없음·최신순)으로 SSR해 온 결과를 그대로 쓰고, 이후 상호작용부터 클라이언트가 재요청한다.
export default function AuctionExplorer({
  initialAuctions,
  sidebar,
}: {
  initialAuctions: AuctionResponse[];
  sidebar?: ReactNode;
}) {
  const { query, setQuery } = useSearch();
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT);
  const [results, setResults] = useState<AuctionResponse[]>(initialAuctions);
  const [totalElements, setTotalElements] = useState(initialAuctions.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const isFirstRun = useRef(true);
  const { wishlisted, toggle } = useWishlistStatus(results.map((a) => a.id));

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ sort: sortBy, size: "60" });
      if (query.trim()) params.set("q", query.trim());
      const res = await apiFetch<AuctionListResponse>(`/api/auctions?${params}`, { cache: "no-store" });
      setResults(res.content);
      setTotalElements(res.totalElements);
    } catch {
      // 실패해도 직전 결과는 유지하고, 에러 배너로 재시도를 유도한다(조용히 삼키지 않는다).
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [query, sortBy]);

  useEffect(() => {
    // 첫 렌더는 SSR 결과(검색어 없음·최신순)와 이미 같은 조건이라 재요청하지 않는다.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const timer = setTimeout(fetchResults, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fetchResults]);

  return (
    <section id="auctions" className="mx-auto max-w-[1160px] px-4 py-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight text-text-1">
            진행 중인 경매
          </h2>
          <p className="mt-1 text-[13px] text-text-3">실시간 업데이트 · 지금 바로 확인하세요</p>
        </div>
        <Link
          href="/auctions"
          className={`shrink-0 text-xs font-bold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
        >
          전체 보기 →
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-text-3">
          <span>{totalElements}개</span>
          {loading && <InlineSpinner />}
          {query && (
            <span className="flex items-center gap-1 font-bold text-primary">
              &quot;{query}&quot; 검색 중
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="검색어 지우기"
                className={`rounded-full text-text-3 hover:text-primary ${FOCUS_RING}`}
              >
                ×
              </button>
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="정렬 기준">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={sortBy === option.key}
              onClick={() => setSortBy(option.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${FOCUS_RING} ${
                sortBy === option.key
                  ? "border-primary bg-primary text-white"
                  : "border-border text-text-2 hover:border-primary hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={sidebar ? "grid items-start gap-6 lg:grid-cols-[1fr_280px]" : undefined}>
        <div>
          {error && (
            <div className="mb-4">
              <ExploreError onRetry={fetchResults} />
            </div>
          )}
          {loading ? (
            <div className={GRID_CLASS}>
              <CardSkeletonGrid count={10} variant="auction" />
            </div>
          ) : results.length === 0 ? (
            error ? null : (
              <ExploreEmpty
                title={query ? `"${query}" 검색 결과가 없어요` : "진행 중인 경매가 없습니다"}
                hint={query ? "다른 키워드로 검색하거나 정렬을 바꿔보세요." : undefined}
                onClear={query ? () => setQuery("") : undefined}
              />
            )
          ) : (
            <div className={`${GRID_CLASS} ${error ? "opacity-45" : ""}`}>
              {results.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  wishlisted={wishlisted.has(auction.id)}
                  onToggleWishlist={(next) => toggle(auction.id, next)}
                />
              ))}
            </div>
          )}
        </div>
        {sidebar}
      </div>
    </section>
  );
}
