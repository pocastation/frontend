"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import AuctionCard from "@/components/AuctionCard";
import { ExploreEmpty, ExploreError, InlineSpinner } from "@/components/explore-states";
import { apiFetch } from "@/lib/api";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionListResponse, AuctionResponse, AuctionSaleType } from "@/lib/types";

// /auctions 전용 페이지(AuctionBrowser)도 같은 정렬 기준을 쓰므로 여기서 export해 재사용한다.
export type SortKey = "latest" | "ending_soon" | "popular" | "views" | "price_asc" | "price_desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "ending_soon", label: "마감임박" },
  { key: "popular", label: "인기순" },
  { key: "views", label: "조회순" },
  { key: "price_asc", label: "낮은 가격" },
  { key: "price_desc", label: "높은 가격" },
];

// 즉시판매는 마감이 없으므로 "마감임박" 정렬이 성립하지 않는다. 전용 페이지(/instant-sales)는
// 이미 빼 뒀는데 홈 임베드만 SORT_OPTIONS 전체를 그대로 써서 이 항목이 홈에만 남아 있었다(#277).
const INSTANT_SORT_OPTIONS = SORT_OPTIONS.filter((option) => option.key !== "ending_soon");

const DEFAULT_SORT: SortKey = "latest";
const DEBOUNCE_MS = 300;
// 모바일은 2열(카드가 화면폭을 꽉 채우지 않게), sm 이상은 auto-fill로 데스크탑 밀도 유지.
const GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(min(210px,100%),1fr))]";

// 검색·정렬을 서버가 처리한다(§B1) — 목록 전체를 한 번에 받아 클라이언트에서 거르던 이전
// 방식은 매물이 늘면 안 맞아 폐기. 초기 진입은 서버컴포넌트(page.tsx)가 이미 기본값(검색어
// 없음·최신순)으로 SSR해 온 결과를 그대로 쓰고, 이후 상호작용부터 클라이언트가 재요청한다.
export default function AuctionExplorer({
  initialAuctions,
  sidebar,
  saleType = "AUCTION",
  sectionId = "auctions",
  title,
  description,
  viewAllHref,
}: {
  initialAuctions: AuctionResponse[];
  sidebar?: ReactNode;
  saleType?: AuctionSaleType;
  sectionId?: string;
  title?: string;
  description?: string;
  viewAllHref?: string;
}) {
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT);
  const [results, setResults] = useState<AuctionResponse[]>(initialAuctions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const isFirstRun = useRef(true);
  // 빠른 연속 정렬/검색 시 응답이 역순으로 도착해 옛 결과가 최신 결과를 덮어쓰는 걸 막는다.
  // 매 요청에 시퀀스 번호를 부여하고, 최신 요청의 응답만 상태에 반영한다.
  const reqIdRef = useRef(0);
  const { wishlisted, toggle } = useWishlistStatus(results.map((a) => a.id));

  const fetchResults = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ saleType, sort: sortBy, size: "60" });
      const res = await apiFetch<AuctionListResponse>(`/api/auctions?${params}`, { cache: "no-store" });
      if (reqId !== reqIdRef.current) return; // 더 최신 요청에 밀렸으면 무시
      setResults(res.content);
    } catch {
      // 실패해도 직전 결과는 유지하고, 에러 배너로 재시도를 유도한다(조용히 삼키지 않는다).
      if (reqId !== reqIdRef.current) return;
      setError(true);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [saleType, sortBy]);

  const sortOptions = saleType === "INSTANT" ? INSTANT_SORT_OPTIONS : SORT_OPTIONS;
  const heading = title ?? (saleType === "INSTANT" ? "즉시판매" : "진행 중인 경매");
  // 섹션 부제(제목 바로 아래). 건수는 노출하지 않는다.
  const subcopy = description ?? (saleType === "INSTANT" ? "기다리지 않고 바로 구매할 수 있는 포토카드" : "실시간 업데이트 · 지금 바로 확인하세요");
  const emptyTitle = saleType === "INSTANT" ? "등록된 즉시판매가 없습니다" : "진행 중인 경매가 없습니다";
  const allHref = viewAllHref ?? (saleType === "INSTANT" ? "/instant-sales" : "/auctions");

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
    <section id={sectionId} className="mx-auto max-w-[1160px] px-4 py-10">
      {/* (1) 제목 + 전체보기 한 줄  (2) 부제  (3) 정렬칩 가로 스크롤 — 모바일에서 칩이 2줄로
          접히거나 전체보기·부제가 밀리지 않게 한다. 칩 줄은 스와이프 가능(스크롤바는 숨김). */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-extrabold tracking-tight text-text-1">
          {heading}
        </h2>
        <Link
          href={allHref}
          className={`shrink-0 text-xs font-bold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
        >
          전체 보기 →
        </Link>
      </div>

      {subcopy && <p className="mt-1 text-[13px] text-text-3">{subcopy}</p>}

      <div
        className="mt-4 mb-6 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="정렬 기준"
      >
        {loading && <InlineSpinner />}
        {sortOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={sortBy === option.key}
            onClick={() => setSortBy(option.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${FOCUS_RING} ${
              sortBy === option.key
                ? "border-primary bg-primary text-white"
                : "border-border text-text-2 hover:border-primary hover:text-primary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={sidebar ? "grid items-start gap-6 lg:grid-cols-[1fr_280px]" : undefined}>
        <div>
          {error && (
            <div className="mb-4">
              <ExploreError onRetry={fetchResults} />
            </div>
          )}
          {results.length > 0 ? (
            // 재정렬·재검색 중에도 기존 카드를 유지하고 dim만 준다(스켈레톤으로 통째 교체 X).
            <div className={`${GRID_CLASS} transition-opacity ${loading ? "opacity-60" : error ? "opacity-45" : ""}`}>
              {results.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  wishlisted={wishlisted.has(auction.id)}
                  onToggleWishlist={(next) => toggle(auction.id, next)}
                />
              ))}
            </div>
          ) : error ? null : (
            // 빈 목록: 로딩 중에도 높이가 다른 스피너/스켈레톤으로 교체하지 않고 빈 상태를
            // 그대로 dim만 준다(레이아웃 시프트 방지). 진행 표시는 카운트 옆 인라인 스피너.
            <div className={loading ? "opacity-60 transition-opacity" : undefined}>
              <ExploreEmpty title={emptyTitle} />
            </div>
          )}
        </div>
        {sidebar}
      </div>
    </section>
  );
}
