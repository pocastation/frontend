"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { MyBiddingListResponse } from "@/lib/types";

// 최근 입찰순으로 내려오므로, 지금 보고 있는(대개 진행 중인) 경매는 앞쪽에 있다.
const LOOKUP_SIZE = 100;

/**
 * 지금 보고 있는 경매에 **내가 입찰한 적이 있는지**.
 *
 * <p>상세 화면의 기본 탭을 정하는 데 쓴다 — 입찰한 사람에게는 상품 설명보다 지금 판이 어떻게
 * 돌아가는지가 먼저다.
 *
 * <p>입찰 이력 API는 닉네임을 마스킹해서 내려주므로 그것으로는 내 입찰을 가려낼 수 없다.
 * 그래서 마이페이지가 쓰는 "내 입찰 목록"을 재사용한다. **정확한 방법은 상세 응답에 플래그를
 * 넣는 것**이고(백엔드 후속 과제), 그때 이 훅은 사라진다.
 *
 * <p>비로그인·조회 실패는 전부 `false`다 — 이 값이 틀려도 탭 하나가 덜 열릴 뿐이라 조용히 넘긴다.
 */
export function useHasMyBid(auctionId: number): boolean {
  const { accessToken, fetchWithAuth } = useAuth();
  const [hasMyBid, setHasMyBid] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth<MyBiddingListResponse>(
          `/api/members/me/bidding?page=0&size=${LOOKUP_SIZE}`,
          { cache: "no-store" },
        );
        if (!cancelled) setHasMyBid(res.content.some((item) => item.id === auctionId));
      } catch {
        // 실패해도 화면은 기본 탭으로 정상 동작한다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, auctionId, fetchWithAuth]);

  return hasMyBid;
}
