"use client";

import WishlistHeart from "@/components/WishlistHeart";
import { useWishlistStatus } from "@/lib/use-wishlist-status";

// 경매 상세페이지(서버 컴포넌트)는 훅을 못 쓰므로, 단일 경매 하나의 찜 상태만 조회하는
// 이 클라이언트 래퍼를 끼워 넣는다. useWishlistStatus는 배치 조회용이지만 원소 1개짜리
// 호출도 그대로 지원해 별도 로직을 만들지 않았다.
export default function AuctionWishlistButton({
  auctionId,
  className,
}: {
  auctionId: number;
  className?: string;
}) {
  const { wishlisted, toggle } = useWishlistStatus([auctionId]);

  return (
    <WishlistHeart
      auctionId={auctionId}
      active={wishlisted.has(auctionId)}
      onToggle={(next) => toggle(auctionId, next)}
      className={className}
      size={18}
    />
  );
}
