"use client";

import { useEffect } from "react";
import { useWishlist } from "./wishlist-context";

// 목록 화면(홈 그리드, 히어로 캐러셀 등)에서 여러 경매 중 내가 찜한 것만 배치로 확인해
// 하트를 채운다. 실제 캐시·조회는 WishlistProvider(레이아웃 전역)가 갖고 있어, 여기서는
// "이 화면 조각이 보여주는 auctionId들은 확인해달라"고 등록만 한다 — 그래야 히어로에서
// 찜한 경매가 그리드에도 즉시 반영된다(반대도 마찬가지).
export function useWishlistStatus(auctionIds: number[]) {
  const { isWishlisted, ensureChecked, toggle } = useWishlist();
  const key = auctionIds.join(",");

  useEffect(() => {
    if (!key) return;
    ensureChecked(key.split(",").map(Number));
  }, [key, ensureChecked]);

  return { wishlisted: { has: isWishlisted }, toggle };
}
