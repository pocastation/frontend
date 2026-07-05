"use client";

import AuctionCard from "@/components/AuctionCard";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import type { AuctionResponse } from "@/lib/types";

// 아티스트 상세(서버 컴포넌트)는 위시리스트 훅을 못 쓰므로, 그 경매 목록만 감싸는 클라이언트
// 조각으로 분리했다(AuctionExplorer/Hero와 같은 이유).
export default function ArtistAuctionGrid({ auctions }: { auctions: AuctionResponse[] }) {
  const { wishlisted, toggle } = useWishlistStatus(auctions.map((a) => a.id));

  if (auctions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-r4 border border-dashed border-border-2 py-16 text-center">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border-2" aria-hidden="true">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
        <div>
          <p className="font-display text-sm font-extrabold text-text-1">아직 등록된 경매가 없어요</p>
          <p className="mt-1 text-xs text-text-3">이 아티스트의 경매가 등록되면 여기에 표시돼요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
      {auctions.map((auction) => (
        <AuctionCard
          key={auction.id}
          auction={auction}
          wishlisted={wishlisted.has(auction.id)}
          onToggleWishlist={(next) => toggle(auction.id, next)}
        />
      ))}
    </div>
  );
}
