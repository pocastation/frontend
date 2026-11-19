"use client";

import { useEffect } from "react";
import { isStandalonePwa } from "@/lib/standalone-pwa";

// An installed app can resume at its previous URL even after the worker requests a navigation.
async function resumeCampaignClick() {
  if (!isStandalonePwa() || document.visibilityState !== "visible" || !("caches" in window)) return;
  const consume = async () => {
    if (!await caches.has("pocastation-campaign-click")) return;
    const cache = await caches.open("pocastation-campaign-click");
    const response = await cache.match("/__campaign-click");
    if (!response) return;
    const click = await response.json();
    if (document.visibilityState !== "visible" || !await cache.delete("/__campaign-click")) return;
    if (click.expiresAt <= Date.now() || !/^\/notifications\/campaigns\/[1-9]\d*$/.test(click.path)) return;
    if (location.pathname === click.path) return;
    if (location.pathname === "/login" && new URLSearchParams(location.search).get("redirect") === click.path) return;
    location.assign(click.path);
  };
  if (navigator.locks) await navigator.locks.request("pocastation-campaign-click", consume);
  else await consume();
}

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
    if (!("serviceWorker" in navigator) || !isStandalonePwa()) return;
    const resume = () => { void resumeCampaignClick().catch(() => {}); };
    const onMessage = (event: MessageEvent) => {
      if (event.origin === location.origin && event.data?.type === "campaign-click") resume();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    resume();
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

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
