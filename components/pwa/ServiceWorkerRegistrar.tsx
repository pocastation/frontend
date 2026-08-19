"use client";

import { useEffect } from "react";

/**
 * 서비스워커 등록. 렌더하는 것은 없다.
 *
 * <p>**개발 환경에서는 등록하지 않는다.** dev 서버는 매 변경마다 번들 경로가 바뀌는데 워커가
 * 중간에 끼면 "고쳤는데 화면이 안 바뀌는" 상황을 만든다. 디버깅 비용이 이득보다 크다.
 *
 * <p>새 버전이 배포되면 워커가 `skipWaiting`으로 즉시 교체된다(public/sw.js). 여기서 페이지를
 * 강제로 새로고침하지는 않는다 — 입찰 중이던 사용자의 화면을 빼앗는 쪽이 더 나쁘고, 우리는
 * HTML·JS를 캐시하지 않아 새로고침 없이도 낡은 화면이 남지 않는다.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      // 등록 실패는 조용히 넘긴다 — 서비스워커가 없어도 사이트는 그대로 동작한다(점진적 향상).
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    // 첫 화면 렌더와 경쟁시키지 않는다. 워커 등록은 급한 일이 아니다.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
