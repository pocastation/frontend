/**
 * 모바일 화면 전환(푸시 전환)의 방향 신호. 화면을 미는 일은 components/NavTransition.tsx가 한다.
 *
 * <p>한 단계 들어가는 링크는 `onNavigate={markNavForward}`, 정해진 경로로 돌아가는 뒤로 버튼은
 * `markNav("back")`을 부른 뒤 이동한다. 히스토리 뒤로가기(router.back()·브라우저 뒤로)는
 * NavTransition이 popstate에서 직접 처리한다. 하단탭·정렬·
 * 필터처럼 같은 높이의 이동에는 표시하지 않는다 — 표시가 없으면 지금처럼 바로 바뀐다.
 *
 * <p>모바일 폭이 아니거나, 모션을 줄인 사용자이거나, 브라우저가 View Transitions를 모르면 표시 자체를
 * 하지 않는다.
 */
// forward·back은 옆으로 미는 푸시 전환, open·close는 위저드가 아래에서 덮고 내려가는 전환이다.
export type NavDirection = "forward" | "back" | "open" | "close";

// 표시 후 이 시간 안에 화면이 바뀌지 않으면 버린다. 서버 응답이 이보다 늦으면 밀지 않고 바로 바꾼다.
const PENDING_TTL_MS = 5000;

let pending: { dir: NavDirection; at: number } | null = null;

export function canAnimateNav(): boolean {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    window.matchMedia("(max-width: 639.98px)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function markNav(dir: NavDirection): void {
  pending = canAnimateNav() ? { dir, at: Date.now() } : null;
}

export function markNavForward(): void {
  markNav("forward");
}

/** 위저드(판매 등록·교환글 작성·교환 신청)로 들어가는 링크에 단다. 아래에서 올라와 덮는다. */
export function markNavOpen(): void {
  markNav("open");
}

const WIZARD_PATHS = ["/auctions/new", "/exchanges/new"];
const WIZARD_PATTERN = /^\/exchanges\/\d+\/apply$/;

/** 이 주소(경로?쿼리)가 위저드인지. 위저드에서 히스토리 뒤로 나가면 옆이 아니라 아래로 내려간다. */
export function isWizardKey(key: string | null): boolean {
  if (!key) return false;
  const pathname = key.split("?")[0];
  return WIZARD_PATHS.includes(pathname) || WIZARD_PATTERN.test(pathname);
}

export function takePendingNav(): NavDirection | null {
  const p = pending;
  pending = null;
  return p && Date.now() - p.at < PENDING_TTL_MS ? p.dir : null;
}

/*
 * 닫기(X)가 쓰는 「어디서 들어왔나」 기록.
 *
 * 위저드를 닫을 때 정해진 경로로 push하면 그 화면이 히스토리에 하나 더 쌓여, 거기서 뒤로를 누르면 방금
 * 닫은 위저드로 돌아간다. 앱 안에서 들어왔으면 히스토리를 되짚고(router.back), 주소로 바로 들어왔거나
 * 로그인을 거쳐 들어왔으면 정해진 경로로 갈아 끼운다(router.replace).
 *
 * 주소마다 직전 화면을 sessionStorage에 적는다. 히스토리 뒤로가기로 다시 그려질 때는 적지 않아,
 * 처음 들어올 때의 기록이 남는다. 기록은 NavTransition이 커밋마다 남긴다.
 */
const ENTRY_PREFIX = "ps:entered-from:";
const AUTH_PATHS = ["/login", "/signup", "/onboarding", "/auth"];

export function rememberEntry(key: string, previousKey: string | null): void {
  try {
    window.sessionStorage.setItem(ENTRY_PREFIX + key, previousKey ?? "");
  } catch {
    // 저장소가 막혀 있으면 기록 없이 둔다. 닫기는 정해진 경로로 간다.
  }
}

/** 지금 화면이 앱 안의 다른 화면에서 들어온 것인지. 로그인·가입을 거쳐 왔으면 아니라고 본다. */
export function enteredFromApp(): boolean {
  const key = `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`;
  let from: string | null = null;
  try {
    from = window.sessionStorage.getItem(ENTRY_PREFIX + key);
  } catch {
    return false;
  }
  return !!from && !AUTH_PATHS.some((p) => from!.startsWith(p));
}

/** 닫기(X)·「나중에 하기」: 앱 안에서 들어왔으면 되돌아가고, 아니면 `fallback`으로 갈아 끼운다. */
export function dismiss(router: { back(): void; replace(href: string): void }, fallback: string): void {
  if (enteredFromApp()) return router.back();
  markNav("close");
  router.replace(fallback);
}
