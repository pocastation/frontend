/*
 * 포카스테이션 서비스워커 — PWA 1차(설치 + 오프라인 셸).
 *
 * ⚠️ 이 파일의 제1원칙: **경매 데이터를 캐시하지 않는다.**
 * 현재가·마감시간·입찰 수는 초 단위로 바뀐다. 서비스워커가 응답을 한 번이라도 저장해 두면
 * 사용자는 낡은 가격을 보고 입찰하게 된다 — 표시 버그가 아니라 신뢰 사고다.
 * 그래서 `/api/**`는 손대지 않고 네트워크로 그냥 흘려보낸다(NetworkOnly).
 *
 * 캐시하는 것은 딱 두 가지다.
 *   1) 빌드 산출 정적 자산(/_next/static/**) — 파일명에 해시가 박혀 있어 내용이 바뀌면 이름이 바뀐다.
 *      즉 stale을 돌려줄 위험이 구조적으로 없다.
 *   2) 오프라인 폴백 문서 — 네트워크가 죽었을 때 보여줄 우리 화면.
 *
 * HTML 문서는 캐시하지 않는다. 항상 네트워크를 먼저 치고, 실패했을 때만 폴백을 준다.
 */

// 캐시 이름의 버전. **이 파일을 고칠 때마다 올린다** — 올려야 옛 캐시가 정리된다.
const VERSION = "v1";
const STATIC_CACHE = `pocastation-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      // 새 서비스워커가 대기 상태로 머무르지 않게 한다. 배포했는데 옛 워커가 계속 사는 상황을 막는다.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)));
      // 이미 열려 있는 탭도 새 워커가 바로 맡는다.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // GET이 아닌 요청(입찰·로그인 등)은 절대 가로채지 않는다.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 다른 오리진(이미지 CDN·결제창 등)은 우리가 판단할 대상이 아니다.
  if (url.origin !== self.location.origin) return;

  // 경매 데이터·인증·미디어·SSE는 전부 네트워크 직행.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/oauth2/") ||
    url.pathname.startsWith("/login/oauth2/") ||
    url.pathname.startsWith("/media/")
  ) {
    return;
  }

  // 문서(페이지 이동) — 네트워크 우선, 실패 시에만 오프라인 폴백. 성공 응답을 저장하지 않는다.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const fallback = await cache.match(OFFLINE_URL);
          return (
            fallback ??
            new Response("오프라인입니다.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
          );
        }
      })(),
    );
    return;
  }

  // 해시가 박힌 빌드 산출물만 캐시 우선. 이름이 곧 내용이라 오래된 값을 줄 수 없다.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
