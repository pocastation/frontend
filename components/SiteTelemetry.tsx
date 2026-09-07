"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

function excludeAuthentication<T extends { url: string }>(event: T): T | null {
  // 이전 화면에서 이미 로드된 측정 스크립트도 현재 인증 경로를 수집하지 못하게 한다.
  if (window.location.pathname === "/auth/totp" || new URL(event.url).pathname === "/auth/totp") return null;
  return event;
}

export default function SiteTelemetry() {
  const pathname = usePathname();
  // PASS 복귀 파라미터와 인증 화면은 외부 분석 수집에서 제외한다.
  if (pathname === "/auth/totp") return null;
  return (
    <>
      <Analytics beforeSend={excludeAuthentication} />
      <SpeedInsights beforeSend={excludeAuthentication} />
    </>
  );
}
