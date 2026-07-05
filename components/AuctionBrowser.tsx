"use client";

import { useEffect, useRef, useState } from "react";
import AuctionCard from "@/components/AuctionCard";
import { SORT_OPTIONS, type SortKey } from "@/components/AuctionExplorer";
import { apiFetch } from "@/lib/api";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionListResponse, AuctionResponse } from "@/lib/types";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const DEFAULT_SORT: SortKey = "latest";

function buildParams(query: string, sort: SortKey, page: number) {
  const params = new URLSearchParams({ sort, size: String(PAGE_SIZE), page: String(page) });
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
}: {
  initialAuctions: AuctionResponse[];
  initialTotalElements: number;
  initialTotalPages: number;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [auctions, setAuctions] = useState(initialAuctions);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(initialTotalElements);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const isFirstRun = useRef(true);
  const { wishlisted, toggle } = useWishlistStatus(auctions.map((a) => a.id));

  // 검색어·정렬이 바뀌면 첫 페이지부터 다시 조회(목록 전체 교체).
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch<AuctionListResponse>(`/api/auctions?${buildParams(query, sort, 0)}`, {
          cache: "no-store",
        });
        setAuctions(res.content);
        setPage(0);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      } catch {
        // 검색 실패는 조용히 무시하고 직전 결과를 유지한다.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, sort]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await apiFetch<AuctionListResponse>(`/api/auctions?${buildParams(query, sort, nextPage)}`, {
        cache: "no-store",
      });
      setAuctions((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch {
      // 더보기 실패는 조용히 무시 — 이미 보이는 목록은 유지.
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = page + 1 < totalPages;

  return (
    <div>
      <label className="mb-5 flex h-11 max-w-[480px] items-center gap-2 rounded-full border border-border px-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-3" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="sr-only">경매 제목, 아티스트명, 멤버명으로 검색</span>
        <input
          type="search"
          placeholder="경매 제목, 아티스트명, 멤버명으로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border-0 bg-transparent text-[13.5px] text-text-1 outline-none placeholder:text-text-3"
        />
      </label>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-text-3">
          총 <strong className="font-bold text-text-1">{totalElements}</strong>개{loading && " · 검색 중..."}
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

      {auctions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <p className="text-sm text-text-3">{query ? "검색 결과가 없어요." : "진행 중인 경매가 없습니다."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(210px,100%),1fr))] gap-3.5">
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

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={`flex h-11 items-center gap-2 rounded-full border border-border-2 bg-white px-6 text-[13.5px] font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
          >
            {loadingMore ? "불러오는 중..." : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
