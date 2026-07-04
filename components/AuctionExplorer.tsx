"use client";

import { useMemo, useState } from "react";
import AuctionCard from "@/components/AuctionCard";
import { useSearch } from "@/lib/search-context";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse } from "@/lib/types";

type SortKey = "latest" | "popular" | "views" | "price_asc" | "price_desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "popular", label: "인기순" },
  { key: "views", label: "조회순" },
  { key: "price_asc", label: "낮은 가격" },
  { key: "price_desc", label: "높은 가격" },
];

export default function AuctionExplorer({ auctions }: { auctions: AuctionResponse[] }) {
  const { query, setQuery } = useSearch();
  const [sortBy, setSortBy] = useState<SortKey>("latest");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return auctions;
    return auctions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.artistName?.toLowerCase().includes(q),
    );
  }, [auctions, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case "popular":
        return list.sort((a, b) => b.bidCount - a.bidCount);
      case "views":
        return list.sort((a, b) => b.viewCount - a.viewCount);
      case "price_asc":
        return list.sort((a, b) => a.currentPrice - b.currentPrice);
      case "price_desc":
        return list.sort((a, b) => b.currentPrice - a.currentPrice);
      case "latest":
      default:
        // 목록 응답엔 등록일시가 없어(id는 자동증가라 id 내림차순이 곧 최신순).
        return list.sort((a, b) => b.id - a.id);
    }
  }, [filtered, sortBy]);

  return (
    <section id="auctions" className="mx-auto max-w-[1160px] px-4 py-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight text-text-1">
            진행 중인 경매
          </h2>
          <p className="mt-1 text-[13px] text-text-3">실시간 업데이트 · 지금 바로 확인하세요</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-text-3">
          <span>{sorted.length}개</span>
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

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <p className="text-sm text-text-3">
            {query ? "검색 결과가 없습니다." : "진행 중인 경매가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(210px,100%),1fr))] gap-3.5">
          {sorted.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </section>
  );
}
