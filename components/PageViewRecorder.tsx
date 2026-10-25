"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { readUtmSource, toPathKey } from "@/lib/page-view";

/**
 * 방문 기록(BE #564). <b>화면을 그리지 않는다.</b>
 *
 * <p>판매글 상세만 세던 {@code AuctionViewRecorder}를 서비스 전체 경로로 넓힌 것이고, 같은 꼴이다
 * — 실패해도 아무것도 하지 않는다. 방문 기록이 화면을 막아서는 안 되고, 서버는 이미 셌는지·세는
 * 경로인지를 가리지 않고 언제나 204로 답하므로 화면이 판정할 것도 없다.
 *
 * <p><b>꼬리표를 매번 보내는 이유.</b> 광고를 눌러 들어온 사람은 첫 화면 주소에만
 * {@code utm_source}가 붙고 다음 화면으로 넘어가면 사라진다. 그래서 주소에 있을 때마다 실어
 * 보내고, 그날 처음 들어온 값만 남기는 일은 서버가 한다.
 *
 * <p><b>세지 않는 경로에서도 꼬리표가 있으면 보낸다.</b> 광고가 집계 대상이 아닌 화면으로
 * 떨어질 수 있는데 그때 광고 성과가 사라지면 안 된다.
 */
export default function PageViewRecorder() {
  const pathname = usePathname();
  // 같은 화면에서 두 번 보내지 않는다. 개발 모드의 이중 마운트도 여기서 걸린다.
  const sent = useRef<string | null>(null);

  useEffect(() => {
    const path = toPathKey(pathname);
    const source = readUtmSource();
    if (!path && !source) return;

    const stamp = `${pathname}|${source ?? ""}`;
    if (sent.current === stamp) return;
    sent.current = stamp;

    void apiFetch<void>("/api/page-views", {
      method: "POST",
      body: { path, source },
    }).catch(() => {});
  }, [pathname]);

  return null;
}
