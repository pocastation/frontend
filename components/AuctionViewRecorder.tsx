"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";

/**
 * 조회 기록(#728). <b>화면을 그리지 않는다.</b>
 *
 * <p>상세는 서버 컴포넌트라 그 요청에는 열람자 쿠키가 실리지 않고, 서버 렌더·프리페치·크롤러가
 * 모두 조회가 된다. 화면이 뜬 뒤 여기서 한 번 부르는 편이 실제 열람에 가깝다.
 *
 * <p>실패해도 아무것도 하지 않는다 — 조회 기록이 상세 열람을 막아서는 안 된다. 서버는 이미
 * 셌는지·본인 글인지를 가리지 않고 언제나 204로 답하므로 화면이 판정할 것도 없다.
 */
export default function AuctionViewRecorder({ auctionId }: { auctionId: number }) {
  // 개발 모드의 이중 마운트와 리렌더에서 두 번 부르지 않는다. 서버가 같은 날을 걸러 주지만
  // 굳이 두 번 보낼 이유가 없다.
  const sent = useRef<number | null>(null);

  useEffect(() => {
    if (sent.current === auctionId) return;
    sent.current = auctionId;
    void apiFetch<void>(`/api/auctions/${auctionId}/view`, { method: "POST" }).catch(() => {});
  }, [auctionId]);

  return null;
}
