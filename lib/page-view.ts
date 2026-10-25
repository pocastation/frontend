/**
 * 방문 통계에 보낼 경로 이름(BE #564·#566).
 *
 * 서버가 아는 이름만 센다. 주소를 그대로 보내지 않는 이유는 둘이다. 주소에 id가 들어가는 화면이
 * 많아 그대로 담으면 값의 종류가 끝없이 늘고, 쿼리스트링에 무엇이 실려 올지 보내는 쪽이 정한다.
 *
 * **마이페이지·주문·결제처럼 개인의 활동이 드러나는 화면은 넣지 않는다.** 방문 통계로 알고 싶은
 * 것이 아니고, 넣으면 비식별이라는 전제가 흔들린다. 인증(`/auth`)·관리자(`/admin`)도 같은 이유로
 * 뺐다 — 서버 열거형에 없으므로 자동으로 빠진다.
 *
 * 이름은 서버 `PageViewPath`와 **글자까지 같아야 한다.** 모르는 이름을 받으면 서버가 400을 내지
 * 않고 조용히 버리므로, 어긋나도 오류가 아니라 **숫자가 안 쌓이는 것으로** 나타난다.
 */
const EXACT: Record<string, string> = {
  "/": "HOME",
  "/auctions": "AUCTIONS",
  "/instant-sales": "INSTANT_SALES",
  "/artists": "ARTISTS",
  "/events": "EVENTS",
  "/search": "SEARCH",
  "/guide": "GUIDE",
  "/signup": "SIGNUP",
};

/** 앞자리가 같으면 그 이름으로 센다. 더 긴 규칙이 먼저 와야 짧은 쪽에 먼저 잡히지 않는다. */
const PREFIX: [string, string][] = [
  ["/auctions/", "AUCTION_DETAIL"],
  ["/artists/", "ARTIST_DETAIL"],
  ["/events/", "EVENT_DETAIL"],
  ["/exchanges/", "EXCHANGE_DETAIL"],
  ["/guide/", "GUIDE"],
  ["/onboarding/", "ONBOARDING"],
];

/**
 * 판매글 목록의 하위 화면은 세지 않는다. `/auctions/new`·`/auctions/submitted`는 로그인한
 * 사람의 등록 흐름이고, `/auctions/ended`는 목록의 변형이라 상세로 세면 숫자가 틀어진다.
 */
const NOT_DETAIL = new Set(["new", "submitted", "ended"]);

/** 교환글 하위의 당사자 전용 화면. 상세로 세면 로그인한 사람의 활동이 상세 조회에 섞인다. */
const NOT_EXCHANGE_DETAIL = new Set(["apply", "requests", "thread", "new"]);

/** @returns 서버가 아는 경로 이름. 세지 않는 화면이면 `null` */
export function toPathKey(pathname: string): string | null {
  const exact = EXACT[pathname];
  if (exact) return exact;

  for (const [prefix, key] of PREFIX) {
    if (!pathname.startsWith(prefix)) continue;
    const rest = pathname.slice(prefix.length).split("/");
    if (prefix === "/auctions/" && NOT_DETAIL.has(rest[0])) return null;
    if (prefix === "/exchanges/") {
      if (NOT_EXCHANGE_DETAIL.has(rest[0])) return null;
      // `/exchanges/{id}/apply` 같은 하위 화면도 상세가 아니다.
      if (rest.length > 1 && rest[1]) return null;
    }
    return key;
  }
  return null;
}

/**
 * 광고 링크의 꼬리표(`utm_source`).
 *
 * `useSearchParams()`를 쓰지 않고 주소를 직접 읽는 이유. 그 훅은 Suspense 경계를 요구해서
 * 레이아웃 전체가 동적 렌더링으로 내려갈 수 있는데, 이 값은 브라우저에서만 필요하다.
 */
export function readUtmSource(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("utm_source");
  return value && value.trim() ? value.trim().slice(0, 32) : null;
}
