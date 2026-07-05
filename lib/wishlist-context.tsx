"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./auth-context";

// 히어로·경매그리드·사이드바·상세페이지 등 여러 화면 조각이 같은 경매를 동시에 보여줄 수 있어,
// 찜 상태를 페이지(레이아웃) 전역에서 하나로 공유한다 — 각자 따로 조회하면 한쪽에서 하트를
// 눌러도 다른 쪽은 새로고침 전까지 옛 상태로 보이는 불일치가 생긴다(SearchContext와 같은 이유).
type WishlistContextValue = {
  isWishlisted: (auctionId: number) => boolean;
  ensureChecked: (auctionIds: number[]) => void;
  toggle: (auctionId: number, next: boolean) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { accessToken, fetchWithAuth } = useAuth();
  const [wishlisted, setWishlisted] = useState<Set<number>>(new Set());
  // 이미 서버에 물어본 적 있는 id — 같은 경매를 여러 조각이 동시에 마운트해도 중복 조회하지 않는다.
  const checkedIdsRef = useRef<Set<number>>(new Set());
  const prevTokenRef = useRef(accessToken);

  useEffect(() => {
    // 로그인 상태가 바뀌면(로그아웃 등) 이전 세션의 찜 캐시를 버린다 — 하트가 다른 사용자의
    // 상태를 잘못 보여주지 않도록(§1 신뢰).
    if (prevTokenRef.current !== accessToken) {
      prevTokenRef.current = accessToken;
      checkedIdsRef.current = new Set();
      setWishlisted(new Set());
    }
  }, [accessToken]);

  const ensureChecked = useCallback(
    (auctionIds: number[]) => {
      if (!accessToken) return;
      const unchecked = auctionIds.filter((id) => !checkedIdsRef.current.has(id));
      if (unchecked.length === 0) return;
      unchecked.forEach((id) => checkedIdsRef.current.add(id));

      (async () => {
        try {
          const ids = await fetchWithAuth<number[]>(
            `/api/members/me/wishlist/status?auctionIds=${unchecked.join(",")}`,
          );
          if (ids.length === 0) return;
          setWishlisted((prev) => {
            const copy = new Set(prev);
            ids.forEach((id) => copy.add(id));
            return copy;
          });
        } catch {
          // 실패하면 다음 시도 때 다시 물어볼 수 있게 확인 기록에서 뺀다.
          unchecked.forEach((id) => checkedIdsRef.current.delete(id));
        }
      })();
    },
    [accessToken, fetchWithAuth],
  );

  const toggle = useCallback((auctionId: number, next: boolean) => {
    checkedIdsRef.current.add(auctionId);
    setWishlisted((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(auctionId);
      else copy.delete(auctionId);
      return copy;
    });
  }, []);

  const isWishlisted = useCallback((auctionId: number) => wishlisted.has(auctionId), [wishlisted]);

  return (
    <WishlistContext.Provider value={{ isWishlisted, ensureChecked, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
}
