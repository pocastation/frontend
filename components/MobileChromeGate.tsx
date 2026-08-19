"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isMobileChromeHiddenRoute } from "@/components/mobile/shell-routes";

/**
 * 모바일 화면을 갖춘 라우트에서 전역 푸터를 **모바일 폭에서만** 접는다.
 *
 * <p>전역 `app/layout.tsx`를 페이지별로 갈라놓지 않기 위한 얇은 래퍼다. 해당하지 않는 경로에서는
 * 아무것도 하지 않으므로, 페이지를 하나씩 이행하는 동안 나머지 화면은 그대로다.
 * 데스크탑 헤더는 자기 자신이 같은 판단을 한다(components/Header.tsx).
 */
export default function MobileChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className={isMobileChromeHiddenRoute(pathname) ? "max-sm:hidden" : undefined}>{children}</div>;
}
