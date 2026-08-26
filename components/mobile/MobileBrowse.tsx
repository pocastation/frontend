"use client";

import Link from "next/link";
import AuctionCard from "@/components/AuctionCard";
import { SORT_OPTIONS, type SortKey } from "@/components/AuctionExplorer";
import { ExploreEmpty, ExploreError } from "@/components/explore-states";
import { useAuctionBrowse } from "@/lib/use-auction-browse";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse, AuctionSaleType } from "@/lib/types";

/**
 * 모바일 거래 목록 — 제안판매·즉시판매 두 화면이 공유한다.
 *
 * <p>상단 언더라인 탭은 **두 라우트를 오가는 내비게이션**이다(한 화면에 상태로 품지 않는다).
 * 상태로 품으면 URL이 하나가 되어 공유 링크·뒤로가기·SSR을 전부 잃는다.
 *
 * <p>조회·정렬·검색·더보기 상태는 데스크탑 `AuctionBrowser`와 **같은 훅**(`useAuctionBrowse`)을
 * 쓴다. 두 벌로 두는 것은 지면 배치뿐이다.
 *
 * <p>홈에서 뺀 정렬 칩이 여기 있다 — 커머스 앱에서 탐색을 담당하는 자리는 목록 화면이다.
 */

// 즉시판매는 마감이 없으니 "마감임박" 정렬을 뺀다 — 눌러도 아무 일 없는 칩을 두지 않는다.
const INSTANT_SORTS = SORT_OPTIONS.filter((option) => option.key !== "ending_soon");

const TABS: { label: string; href: string; saleType: AuctionSaleType }[] = [
  { label: "제안판매", href: "/auctions", saleType: "AUCTION" },
  { label: "즉시판매", href: "/instant-sales", saleType: "INSTANT" },
];

export default function MobileBrowse({
  initialAuctions,
  initialTotalElements,
  initialTotalPages,
  saleType,
  initialQuery = "",
}: {
  initialAuctions: AuctionResponse[];
  initialTotalElements: number;
  initialTotalPages: number;
  saleType: AuctionSaleType;
  initialQuery?: string;
}) {
  const {
    query,
    setQuery,
    sort,
    setSort,
    auctions,
    totalElements,
    loading,
    loadingMore,
    error,
    moreError,
    hasMore,
    loadMore,
    retry,
    wishlisted,
    toggle,
  } = useAuctionBrowse({
    initialAuctions,
    initialTotalElements,
    initialTotalPages,
    saleType,
    initialQuery,
  });

  const isInstant = saleType === "INSTANT";
  const sortOptions: readonly { key: SortKey; label: string }[] = isInstant ? INSTANT_SORTS : SORT_OPTIONS;

  return (
    <div>
      {/* 상단바 48px 바로 아래에 붙어 함께 고정된다 — 스크롤해도 어느 목록인지 놓치지 않게. */}
      <div className="sticky top-12 z-[250] border-b border-border bg-white">
        <div role="tablist" className="flex gap-1 px-2.5">
          {TABS.map((tab) => {
            const on = tab.saleType === saleType;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={on ? "page" : undefined}
                role="tab"
                aria-selected={on}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors ${FOCUS_RING} ${
                  on ? "border-primary font-extrabold text-text-1" : "border-transparent font-medium text-text-2"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="px-[14px] pt-3">
        <label className="flex h-10 items-center gap-2 rounded-full border border-border px-3.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-3" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="sr-only">{isInstant ? "즉시판매 검색" : "제안판매 검색"}</span>
          <input
            type="search"
            placeholder="스타, 멤버, 앨범 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border-0 bg-transparent text-[13px] text-text-1 outline-none placeholder:text-text-3"
          />
        </label>
      </div>

      {/* 정렬 칩 — 화면폭을 넘으면 가로로 흘린다(줄바꿈해서 두 줄이 되면 목록이 그만큼 밀린다). */}
      <div className="mt-2.5 flex gap-1.5 overflow-x-auto px-[14px] pb-0.5" role="group" aria-label="정렬 기준">
        {sortOptions.map((option) => {
          const on = sort === option.key;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={on}
              onClick={() => setSort(option.key)}
              className={`min-h-9 flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-bold transition-colors ${FOCUS_RING} ${
                on ? "border-text-1 bg-text-1 text-white" : "border-border-2 bg-white text-text-2"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 px-[14px] text-[11.5px] tabular-nums text-text-3">
        {totalElements.toLocaleString("ko-KR")}개
      </p>

      {error && (
        <div className="px-[14px] pt-3">
          <ExploreError onRetry={retry} />
        </div>
      )}

      {auctions.length > 0 ? (
        // 재정렬·재검색 중에도 기존 카드를 유지하고 dim만 준다(스켈레톤으로 통째 교체 X).
        <div
          className={`mt-2 grid grid-cols-2 gap-x-2 gap-y-[18px] px-[14px] transition-opacity ${
            loading ? "opacity-60" : error ? "opacity-45" : ""
          }`}
        >
          {auctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              wishlisted={wishlisted.has(auction.id)}
              onToggleWishlist={(next) => toggle(auction.id, next)}
              variant="compact"
            />
          ))}
        </div>
      ) : error ? null : (
        <div className={`px-[14px] ${loading ? "opacity-60 transition-opacity" : ""}`}>
          <ExploreEmpty
            title={query ? `"${query}" 검색 결과가 없어요` : isInstant ? "등록된 즉시판매가 아직 없어요" : "진행 중인 매물이 아직 없어요"}
            hint={query ? "다른 키워드로 검색하거나 정렬을 바꿔보세요." : undefined}
            onClear={query ? () => setQuery("") : undefined}
          />
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-6 flex flex-col items-center gap-2 px-[14px]">
          {moreError && <p className="text-[11.5px] font-bold text-danger">더 불러오지 못했어요.</p>}
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={`flex h-11 w-full items-center justify-center rounded-[7px] border border-border-2 bg-white text-[13px] font-bold text-text-2 disabled:opacity-60 ${FOCUS_RING}`}
          >
            {loadingMore ? "불러오는 중..." : moreError ? "다시 시도" : "더 보기"}
          </button>
        </div>
      )}

      {/* 완료된 거래는 지금 살 수 있는 매물이 아니라 지난 기록이다 — 목록과 성격이 달라
          조용한 링크 한 줄로 둔다.
          🔴 라벨이 「시세 확인하기」였다. §1.7·§9.4로 성사가를 감추면서 **누르면 시세가
          없는 화면**이 됐다(T40 패턴). 그 화면이 실제로 보여주는 것만 말한다. */}
      {!isInstant && (
        <Link
          href="/auctions/ended"
          className={`mt-6 block border-t border-border px-[14px] py-4 text-center text-[12.5px] font-bold text-text-2 ${FOCUS_RING}`}
        >
          거래 완료된 매물 보기
        </Link>
      )}
    </div>
  );
}
