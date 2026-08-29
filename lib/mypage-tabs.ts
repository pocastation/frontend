// 마이페이지 탭 정의 — 데스크탑 사이드바와 모바일 메뉴 목록이 같은 키를 쓰기 위해 페이지에서
// 뽑아냈다. **탭 콘텐츠는 두 지면에서 같고 다른 건 내비게이션뿐**이라, 키·제목·딥링크 해석은
// 한 곳에만 두고 양쪽이 읽는다.
//
// 메뉴가 13개까지 늘어나 스캔이 어려워져, 같은 성격의 화면을 한 탭 + 내부 필터로 합쳤다.
// - bidding("가격 제안"): 예전 participating(진행 중) + bidHistory(전체)
// - purchases("구매 내역"): 예전 won(제안 거래) + instantPurchases(즉시구매)
// 예전 키로 들어오는 딥링크(/mypage?tab=won 등)는 LEGACY_TAB_ALIAS로 흡수한다.
export type MypageTab =
  | "dashboard"
  | "bidding"
  | "purchases"
  | "selling"
  | "sellHistory"
  | "wishlist"
  | "profile"
  | "shipping"
  | "payment"
  | "settlement"
  | "refund"
  | "settings";

// 합쳐진 탭 안에서 어느 묶음을 보고 있는지.
export type BiddingFilter = "live" | "all";
export type PurchaseFilter = "auction" | "instant";

// 탭 제목의 단일 진실원 — 데스크탑 본문 h1과 모바일 서브 화면 앱바가 같은 문구를 쓴다.
export const TAB_TITLE: Record<MypageTab, string> = {
  dashboard: "대시보드",
  bidding: "가격 제안",
  purchases: "구매 내역",
  selling: "판매 중인 매물",
  sellHistory: "판매 내역",
  wishlist: "관심 목록",
  profile: "내 정보",
  shipping: "배송지 관리",
  payment: "결제수단",
  settlement: "정산계좌",
  refund: "환불계좌",
  settings: "계정 설정",
};

// /mypage?tab= 쿼리 검증용 — 존재하는 탭 키만 허용.
//
// ⚠️ 목록(ACCOUNT_NAV)에서 감춘 `payment`도 여기엔 남아야 한다. 빠지면 `?tab=payment` 진입이
// 검증에서 튕기고, 그 순간 카드 미등록 구매자의 [카드 등록] CTA(SECOND_CHANCE_OFFERED)와
// 승계 배너 링크가 통째로 죽는다 — 거래가 성사됐는데 결제할 방법이 사라진다.
const TAB_KEYS = new Set<string>(Object.keys(TAB_TITLE));

// 탭을 합치기 전 키로 들어오는 기존 링크·북마크를 새 탭(+내부 필터)으로 흘려보낸다.
const LEGACY_TAB_ALIAS: Record<string, ResolvedTab> = {
  participating: { tab: "bidding", bidding: "live" },
  bidHistory: { tab: "bidding", bidding: "all" },
  won: { tab: "purchases", purchase: "auction" },
  instantPurchases: { tab: "purchases", purchase: "instant" },
};

export type ResolvedTab = { tab: MypageTab; bidding?: BiddingFilter; purchase?: PurchaseFilter };

/** `?tab=` 한 개를 탭(+내부 필터)으로 해석한다. 값이 없거나 모르는 키면 null(=모바일 메뉴 화면). */
export function resolveTabQuery(raw: string | null): ResolvedTab | null {
  if (!raw) return null;
  if (TAB_KEYS.has(raw)) return { tab: raw as MypageTab };
  return LEGACY_TAB_ALIAS[raw] ?? null;
}
