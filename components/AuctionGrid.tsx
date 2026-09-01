"use client";

import AuctionCard from "@/components/AuctionCard";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import type { AuctionResponse } from "@/lib/types";

// 서버 컴포넌트(아티스트 상세·판매자 프로필)는 위시리스트 훅을 못 쓰므로, 매물 목록만 감싸는
// 클라이언트 조각으로 분리했다(AuctionExplorer/Hero와 같은 이유).
// 빈 상태 문구는 호출부마다 달라서 프롭으로 받는다(기본값은 아티스트 상세 기준).
export default function AuctionGrid({
  auctions,
  emptyTitle = "아직 등록된 매물이 없어요",
  emptyDescription = "이 스타의 매물이 등록되면 여기에 표시돼요.",
  variant = "default",
  gridClassName = "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5",
}: {
  auctions: AuctionResponse[];
  emptyTitle?: string;
  emptyDescription?: string;
  /**
   * 카드 리듬(#499). 기본은 데스크탑형(테두리·그림자 있는 카드)이고, 모바일 지면을 함께 쓰는
   * 화면은 `compact`를 넘긴다 — 홈·목록·검색이 전부 그쪽이다.
   */
  variant?: "default" | "compact";
  /** 격자 배치. 좌우 14px 지면에 2열로 까는 화면은 이 값을 바꿔 넘긴다. */
  gridClassName?: string;
}) {
  const { wishlisted, toggle } = useWishlistStatus(auctions.map((a) => a.id));

  if (auctions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-r4 border border-dashed border-border-2 py-16 text-center">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border-2" aria-hidden="true">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
        <div>
          <p className="font-display text-sm font-extrabold text-text-1">{emptyTitle}</p>
          <p className="mt-1 text-xs text-text-3">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={gridClassName}>
      {auctions.map((auction) => (
        <AuctionCard
          key={auction.id}
          auction={auction}
          variant={variant}
          wishlisted={wishlisted.has(auction.id)}
          onToggleWishlist={(next) => toggle(auction.id, next)}
        />
      ))}
    </div>
  );
}
