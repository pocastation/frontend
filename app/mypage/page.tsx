"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist-context";
import DeliveryAddressBook from "@/components/DeliveryAddressBook";
import PaymentMethodManager from "@/components/PaymentMethodManager";
import BankAccountManager from "@/components/BankAccountManager";
import ProfileTab from "@/components/ProfileTab";
import SettingsTab from "@/components/SettingsTab";
import BadgeChips from "@/components/BadgeChips";
import DeliveryAddressModal from "@/components/DeliveryAddressModal";
import ReviewComposerModal from "@/components/ReviewComposerModal";
import OrderShipForm from "@/components/OrderShipForm";
import ReturnRequestModal from "@/components/ReturnRequestModal";
import ReturnShipForm from "@/components/ReturnShipForm";
import { type StatusTone } from "@/components/StatusIcon";
import { formatDateTimeKST, formatKRW, formatTimeLeft } from "@/lib/format";
import { cancellationLocksAt } from "@/lib/fees";
import {
  AUCTION_STATUS_TONE,
  AUCTION_STATUS_LABEL,
  SELLER_AUCTION_STATUS_LABEL,
  REFUND_REASON_LABEL,
  RETURN_REASON_LABEL,
  plainLevelLabel,
} from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type {
  AuctionListResponse,
  AuctionResponse,
  MyBiddingListResponse,
  MyBiddingResponse,
  MySellingAuctionListResponse,
  MySellingAuctionResponse,
  MyOrderStatusResponse,
  ReviewableOrderResponse,
  SoldOrderResponse,
  WishlistListResponse,
} from "@/lib/types";
// 값이라 type import와 나눈다 — 「아직 발송 전인가」는 서버와 같은 이름의 판정이다.
import { isBeforeShipment } from "@/lib/types";
import IdentityVerificationPanel from "@/components/IdentityVerificationPanel";
import OfferWithdrawModal from "@/components/OfferWithdrawModal";
import SellingListingActions from "@/components/SellingListingActions";
import AuctionCard from "@/components/AuctionCard";
import MobileShell from "@/components/mobile/MobileShell";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import MobileMypageMenu from "@/components/mobile/MobileMypageMenu";
import {
  TAB_TITLE,
  resolveTabQuery,
  type BiddingFilter,
  type MypageTab,
  type PurchaseFilter,
} from "@/lib/mypage-tabs";

const SELLING_TAB_STATUSES = new Set<AuctionResponse["status"]>([
  "PENDING_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "LIVE",
  "REJECTED",
]);

// 구매자가 직접 손봐야 결제가 굴러가는 주문 상태 — 모바일 메뉴 배지의 근거.
const PURCHASE_ACTION_STATUSES = new Set<MyOrderStatusResponse["status"]>([
  "PAYMENT_PENDING",
  "PAYMENT_RETRYING",
  "PAYMENT_FAILED",
  "SECOND_CHANCE_OFFERED",
]);

const PUBLIC_DETAIL_STATUSES = new Set<AuctionResponse["status"]>([
  "LIVE",
  "ENDED_SOLD",
  "ENDED_NO_BIDS",
  "CANCELLED",
]);

type SellingListItem = AuctionResponse | MySellingAuctionResponse;

// 제안 철회 줄의 버튼(#428). 판매 관리의 아웃라인 버튼과 같은 무게로 둔다 — 취소는 예외적인
// 행동이 아니라 §1.2가 보장한 권리라, 눈에 띄게 만들 이유도 숨길 이유도 없다.
const OFFER_ACTION_CLASS =
  `shrink-0 rounded-r2 border border-border-2 bg-surface px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 ${FOCUS_RING}`;

// 탭 키·제목·딥링크 해석은 lib/mypage-tabs.ts에 있다 — 모바일 메뉴 목록이 같은 정의를 읽는다.
type Tab = MypageTab;

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 13a9 9 0 0 1 18 0" />
      <path d="M12 13l4-4" />
      <circle cx="12" cy="13" r="1" />
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
    </svg>
  );
}
function BadgeCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.2 2.2 4.8-4.8" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20 12 12.5 4.5A2 2 0 0 0 11 4H5a1 1 0 0 0-1 1v6c0 .5.2 1 .6 1.4L12 20Z" />
      <circle cx="8" cy="8" r="1.3" />
    </svg>
  );
}
function ArchiveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}
// Feather Icons credit-card — 아이콘 path는 손으로 그리지 않고 검증된 오픈소스 path를 그대로 사용.
function CardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

// 정산계좌 — 지폐·카드와 구분되게 건물(은행) 실루엣으로.
function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
      <path d="M3 10 12 4l9 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v8M10 10v8M14 10v8M19 10v8" strokeLinecap="round" />
      <path d="M3 20h18" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const TRADE_NAV: { key: Tab; label: string; icon: () => ReactNode }[] = [
  { key: "dashboard", label: "대시보드", icon: DashboardIcon },
  { key: "bidding", label: "가격 제안", icon: TicketIcon },
  { key: "purchases", label: "구매 내역", icon: BadgeCheckIcon },
  { key: "selling", label: "판매 중인 매물", icon: TagIcon },
  { key: "sellHistory", label: "판매 내역", icon: ArchiveIcon },
  { key: "wishlist", label: "관심 목록", icon: HeartIcon },
];

const ACCOUNT_NAV: { key: Tab; label: string; icon: () => ReactNode; hidden?: boolean }[] = [
  { key: "profile", label: "내 정보", icon: UserIcon },
  { key: "shipping", label: "배송지 관리", icon: PinIcon },
  // 결제수단(카드 빌링키)은 목록에서만 감춘다(2026-08-07). 카드에 에스크로 상품이 없다는 것이
  // 확인돼(docs ⓪-1) 결제 흐름이 가상계좌 전환 / 카드 유지 + 정산보류 두 갈래로 갈렸고 아직
  // 결정 전이다. 결정도 안 난 수단을 스스로 등록하러 오게 둘 이유는 없다.
  //
  // ⚠️ 목록에서 빼되 **항목은 남긴다.** 지우면 TAB_KEYS에서도 빠져 `?tab=payment` 진입이
  // 검증에서 튕기고, 그 순간 카드 미등록 구매자의 [카드 등록] CTA(SECOND_CHANCE_OFFERED)와
  // 승계 배너 링크가 통째로 죽는다 — 거래가 성사됐는데 결제할 방법이 사라진다.
  // 되살릴 때는 hidden만 지우면 된다.
  { key: "payment", label: "결제수단", icon: CardIcon, hidden: true },
  { key: "settlement", label: "정산계좌", icon: BankIcon },
  // 환불계좌를 정산계좌 바로 아래 둔다 — 둘은 「돈이 오가는 계좌」로 같은 묶음이고, 나란히
  // 있어야 「왜 둘이지?」에 화면이 스스로 답한다(#431).
  { key: "refund", label: "환불계좌", icon: BankIcon },
  { key: "settings", label: "계정 설정", icon: GearIcon },
];

// 아직 준비 중인 탭만 안내를 보여준다 — 현재 남은 스텁 없음(계정 설정은 회원 탈퇴로 실구현됨).
const STUB_TABS = new Set<Tab>([]);

/**
 * 탭 본문의 제목 줄.
 *
 * <p>모바일에서는 접는다 — 서브 화면 앱바가 이미 같은 제목을 들고 있어, 화면 안에서 h1으로
 * 한 번 더 반복하면 같은 말이 두 줄 연달아 나온다(모바일 킷 규칙).
 */
function TabHead({ title, sub }: { title: string; sub: ReactNode }) {
  return (
    <div className="hidden sm:block">
      <h1 className="font-display text-xl font-extrabold text-text-1">{title}</h1>
      <p className="mt-1 text-sm text-text-3">{sub}</p>
    </div>
  );
}

// 합쳐진 탭 안의 세그먼트 필터 — 사이드바 메뉴를 늘리지 않고 묶음을 전환한다.
function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: T; label: string; count: number }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    // 🔴 알약 칩에서 밑줄 탭으로(#419). 활성 칩이 보라로 **채워져** 있어 필터가 아니라 눌린
    // 버튼처럼 보였고, 알약이 같은 화면의 상태 표시와도 겹쳐 무엇이 조작 가능한지 흐려졌다.
    // 매물 상세 모바일이 이미 쓰는 방식이라 같은 서비스로 읽힌다.
    <div className="mt-4 flex gap-5 border-b border-border" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={`-mb-px border-b-2 pb-2.5 text-[13px] transition-colors ${FOCUS_RING} ${
            value === option.key
              ? "border-primary font-extrabold text-text-1"
              : "border-transparent font-bold text-text-3 hover:text-text-2"
          }`}
        >
          {option.label}
          <span className={`ml-1.5 text-xs tabular-nums ${value === option.key ? "text-text-2" : "text-text-3"}`}>
            {option.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// 당근식 통합 마이페이지 — 판매자/구매자 계정 구분 없이 "내 활동" = 판매 + 가격 제안.
//
// 데스크탑과 모바일이 **같은 탭 콘텐츠를 공유하고 내비게이션만 갈린다.** 데스크탑은 좌 사이드바
// 240px + 우 콘텐츠로 한 화면이고, 모바일은 `/mypage`가 메뉴 목록이며 `?tab=X`가 서브 화면으로
// 열린다. 그래서 선택된 탭을 URL 쿼리에 두고(useSearchParams) 양쪽이 그걸 읽는다 — 로컬 state로만
// 두면 모바일에서 뒤로가기·하단탭 이동이 화면과 어긋난다.
function MyPageBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, member, isLoading, fetchWithAuth, logout } = useAuth();
  const { toggle: toggleWishlistCache } = useWishlist();

  // null = 쿼리 없음. 모바일은 메뉴 목록, 데스크탑은 대시보드다(한 화면이라 늘 무언가를 보여준다).
  const requested = resolveTabQuery(searchParams.get("tab"));
  const tab = requested?.tab ?? null;
  const activeTab: Tab = tab ?? "dashboard";
  const [biddingFilter, setBiddingFilter] = useState<BiddingFilter>("live");
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>("auction");

  // 탭 전환은 쿼리를 바꾸는 것으로 통일한다 — 그래야 모바일 앱바 뒤로·브라우저 뒤로가 살아 있고,
  // 지금 보고 있는 화면을 그대로 공유·북마크할 수 있다.
  const selectTab = useCallback(
    (next: Tab) => {
      router.push(`/mypage?tab=${next}`, { scroll: false });
    },
    [router],
  );

  // 대시보드 패널의 "전체 보기"는 합쳐진 탭으로 가되, 그 패널이 보여주던 묶음이 선택된 채로 열려야 한다.
  function goToBidding(filter: BiddingFilter) {
    setBiddingFilter(filter);
    selectTab("bidding");
  }
  function goToPurchases(filter: PurchaseFilter) {
    setPurchaseFilter(filter);
    selectTab("purchases");
  }
  // 모바일에선 메뉴(aside)가 콘텐츠 위에 쌓여, 탭을 눌러도 콘텐츠가 화면 밖 아래에서 바뀌어
  // "아무 반응 없어" 보인다. 탭이 바뀌면(초기 진입 제외) 콘텐츠로 스크롤해준다(lg 미만).
  const contentRef = useRef<HTMLDivElement>(null);
  const firstTabRender = useRef(true);
  const [selling, setSelling] = useState<MySellingAuctionResponse[]>([]);
  const [bidding, setBidding] = useState<MyBiddingResponse[]>([]);
  const [instantPurchases, setInstantPurchases] = useState<AuctionResponse[]>([]);
  const [wishlist, setWishlist] = useState<AuctionResponse[]>([]);
  // 구매(거래 성사·즉시구매) 건의 주문 결제 상태 — auctionId 키(#113, wishlist 하트 배치 채움 패턴).
  const [orders, setOrders] = useState<Record<number, MyOrderStatusResponse>>({});
  // 판매 건의 주문(판매자 관점, #119) — auctionId 키. 발송 UI가 소비.
  const [soldOrders, setSoldOrders] = useState<Record<number, SoldOrderResponse>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 거래 성사 후 배송지 입력 팝업(§13 "배송지 자동채움") — 기본배송지가 없어 자동확정 못한 주문을
  // 마이페이지 진입 즉시 모달로 띄운다. 사용자가 "나중에"로 닫으면 이번 세션에선 다시 안 띄운다.
  const [addressModalOrder, setAddressModalOrder] = useState<{ auctionId: number; title: string } | null>(null);
  const [withdrawTarget, setWithdrawTarget] =
    useState<{ auctionId: number; bidId: number; title: string } | null>(null);
  const dismissedAddressIds = useRef<Set<number>>(new Set());
  // 거래 리뷰(§12.6) — 작성 가능한(구매확정 후 14일 내 미작성) 주문 목록 + 작성 모달 대상.
  const [reviewable, setReviewable] = useState<ReviewableOrderResponse[]>([]);
  const [reviewModalOrder, setReviewModalOrder] = useState<ReviewableOrderResponse | null>(null);

  // 탭 자체는 쿼리에서 읽지만, 예전 키 딥링크(/mypage?tab=won 등)가 함께 지정하는 **내부 필터**는
  // 그 뒤 사용자가 칩으로 바꿀 수 있어야 하므로 state다 — 진입 시 1회만 반영한다.
  const aliasBidding = requested?.bidding;
  const aliasPurchase = requested?.purchase;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 딥링크가 지정한 초기 묶음 반영.
    if (aliasBidding) setBiddingFilter(aliasBidding);
    if (aliasPurchase) setPurchaseFilter(aliasPurchase);
  }, [aliasBidding, aliasPurchase]);

  useEffect(() => {
    if (firstTabRender.current) {
      firstTabRender.current = false;
      return;
    }
    // 모바일은 메뉴 목록 ↔ 서브 화면이 통째로 갈리므로 문서 맨 위로 올린다(앱바가 그 자리에 있다).
    if (window.innerWidth < 640) {
      window.scrollTo({ top: 0 });
      return;
    }
    if (window.innerWidth < 1024) {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tab]);

  const loadMyActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sellingRes, biddingRes, instantPurchasesRes, wishlistRes] = await Promise.all([
        fetchWithAuth<MySellingAuctionListResponse>("/api/members/me/selling?size=50"),
        fetchWithAuth<MyBiddingListResponse>("/api/members/me/bidding?size=50"),
        fetchWithAuth<AuctionListResponse>("/api/members/me/instant-purchases?size=50"),
        fetchWithAuth<WishlistListResponse>("/api/members/me/wishlist?size=50"),
      ]);
      setSelling(sellingRes.content);
      setBidding(biddingRes.content);
      setInstantPurchases(instantPurchasesRes.content);
      setWishlist(wishlistRes.content);

      // 구매 확정 건(거래 성사 + 즉시구매)의 주문 상태를 배치로 채운다 — 주문이 없는 매물은 응답에 안 온다.
      // 배치 채움 실패는 non-fatal: 목록은 그대로 보여주고 상태 푸터만 생략한다(wishlist 하트와 동일 원칙).
      // 🔴 예전에는 isTopBidder로 「내가 성사된 건」만 골라 보냈는데, 그 필드가 사라졌다(§1.7 —
      // 「내가 1등이다」는 남의 제안 상태다). 성사된 매물 전체를 보내고 **주문이 돌아오는지로
      // 판정**한다 — 이 API는 내 주문만 돌려주므로 오히려 더 정확하다(승계로 성사된 건도 잡힌다).
      //
      // 🔴 **MATCHED를 반드시 포함한다**(#419). 거래 개편으로 결제 대기 상태가 ENDED_SOLD에서
      // MATCHED로 바뀌었는데(BE #368) 여기가 ENDED_SOLD만 보고 있었다 — 결제해야 할 주문을
      // **조회조차 하지 않아** 선택된 구매자가 결제 화면에 닿을 수 없었다. 알림은 「48시간 안에
      // 결제해 주세요」라고 하는데 그 화면이 없는 상태였다.
      const purchasedIds = [
        ...biddingRes.content
          .filter((b) => b.status === "MATCHED" || b.status === "ENDED_SOLD")
          .map((b) => b.id),
        ...instantPurchasesRes.content.map((a) => a.id),
      ];
      try {
        if (purchasedIds.length > 0) {
          const orderRes = await fetchWithAuth<MyOrderStatusResponse[]>(
            `/api/members/me/orders/status?auctionIds=${purchasedIds.join(",")}`,
          );
          setOrders(Object.fromEntries(orderRes.map((o) => [o.auctionId, o])));
        } else {
          setOrders({});
        }
      } catch {
        setOrders({});
      }

      // 판매 건의 주문(발송 UI) — 판매자 관점. 주문이 없는(미성사·미결제) 매물은 응답에 안 온다.
      const sellingIds = sellingRes.content.map((a) => a.id);
      try {
        if (sellingIds.length > 0) {
          const soldRes = await fetchWithAuth<SoldOrderResponse[]>(
            `/api/members/me/sold-orders/status?auctionIds=${sellingIds.join(",")}`,
          );
          setSoldOrders(Object.fromEntries(soldRes.map((o) => [o.auctionId, o])));
        } else {
          setSoldOrders({});
        }
      } catch {
        setSoldOrders({});
      }

      // 작성 가능한 리뷰(구매확정 후 14일 내 미작성) — 실패는 non-fatal.
      try {
        setReviewable(await fetchWithAuth<ReviewableOrderResponse[]>("/api/reviews/reviewable"));
      } catch {
        setReviewable([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "내 활동을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  // 배송지 미확정(기본배송지 없이 거래 성사) 주문이 있으면 진입 즉시 팝업 — 이미 열려있거나 이번
  // 세션에 "나중에"로 닫은 주문은 다시 띄우지 않는다.
  useEffect(() => {
    if (addressModalOrder) return;
    const pending = Object.values(orders).find(
      (o) =>
        o.status === "PAID" &&
        // 준비 중이어도 주소가 없으면 여전히 입력해야 한다 — 주소가 없으면 판매자는 애초에
        // 보낼 수 없다. 「발송 전 전체」로 보는 이유가 서버 쪽 T2와 같다.
        isBeforeShipment(o.fulfillmentStatus) &&
        !o.hasDeliveryAddress &&
        !dismissedAddressIds.current.has(o.auctionId),
    );
    if (!pending) return;
    const auction = [...bidding, ...instantPurchases].find((a) => a.id === pending.auctionId);
    setAddressModalOrder({ auctionId: pending.auctionId, title: auction?.title ?? "구매 상품" });
  }, [orders, bidding, instantPurchases, addressModalOrder]);

  function openAddressModal(auctionId: number, title: string) {
    setAddressModalOrder({ auctionId, title });
  }

  // 제안 철회 확인(#428). 되돌릴 수 없는 행동이라 한 번 묻고, 끝나면 목록을 다시 읽는다 —
  // 인원수·금액·상태가 한꺼번에 바뀌므로 화면에서 지워 흉내내지 않는다.
  function openWithdrawModal(item: MyBiddingResponse) {
    if (item.myOfferId == null) return;
    setWithdrawTarget({ auctionId: item.id, bidId: item.myOfferId, title: item.title });
  }

  async function handleOfferWithdrawn() {
    setWithdrawTarget(null);
    await loadMyActivity();
  }

  function closeAddressModal() {
    if (addressModalOrder) dismissedAddressIds.current.add(addressModalOrder.auctionId);
    setAddressModalOrder(null);
  }

  // orders를 먼저 갱신한 뒤에 모달을 닫아야 한다 — 순서를 바꾸면 아직 갱신 전인 stale orders로
  // 자동팝업 이펙트가 재평가되어 방금 확정한 같은 주문을 또 띄우는 레이스가 생긴다.
  async function handleAddressSaved() {
    await loadMyActivity();
    setAddressModalOrder(null);
  }

  // 구매확정 직후 곧바로 후기 작성 모달을 띄운다(당근식 즉시 진입) — 확정 반영 후 reviewable에서
  // 방금 확정한 주문을 찾아 연다. 확정 자체는 이미 성공했으니 모달 실패는 조용히(목록에서 재작성 가능).
  const handleConfirmed = useCallback(
    async (auctionId: number) => {
      await loadMyActivity();
      try {
        const rev = await fetchWithAuth<ReviewableOrderResponse[]>("/api/reviews/reviewable");
        setReviewable(rev);
        const target = rev.find((r) => r.auctionId === auctionId);
        if (target) setReviewModalOrder(target);
      } catch {
        // 무시 — 마이페이지 "작성 가능한 리뷰"에서 나중에 작성 가능.
      }
    },
    [fetchWithAuth, loadMyActivity],
  );

  async function handleReviewSaved() {
    setReviewModalOrder(null);
    try {
      setReviewable(await fetchWithAuth<ReviewableOrderResponse[]>("/api/reviews/reviewable"));
    } catch {
      // 무시 — 다음 새로고침에서 보정.
    }
  }

  // 모바일 관심 목록은 카드 하트(WishlistHeart)가 API를 직접 부른다 — 여기서는 결과만 반영한다.
  // 데스크탑 리스트의 handleRemoveWishlist와 달리 DELETE를 또 보내면 안 된다.
  function handleWishlistToggled(auctionId: number, next: boolean) {
    toggleWishlistCache(auctionId, next);
    if (!next) {
      setWishlist((prev) => prev.filter((a) => a.id !== auctionId));
      return;
    }
    // next=true는 하트가 실패를 되돌린 경우다 — 목록에서 이미 뺐으니 서버 상태로 다시 맞춘다.
    void loadMyActivity();
  }

  // 관심목록 해제 — 실패하면(드묾) 전체를 다시 불러와 서버 상태와 어긋나지 않게 한다.
  async function handleRemoveWishlist(auctionId: number) {
    setWishlist((prev) => prev.filter((a) => a.id !== auctionId));
    try {
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/wishlist`, { method: "DELETE" });
    } catch {
      await loadMyActivity();
    }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) {
      router.replace("/login?redirect=/mypage");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 인증 상태 확정 후 서버 데이터를 동기화한다.
    void loadMyActivity();
  }, [accessToken, isLoading, loadMyActivity, router]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (isLoading || !accessToken) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">
        마이페이지를 불러오는 중...
      </div>
    );
  }

  const activeSelling = selling.filter((auction) => SELLING_TAB_STATUSES.has(auction.status));
  const sellingHistory = selling.filter((auction) => !SELLING_TAB_STATUSES.has(auction.status));
  // 「진행 중」 = 아직 결과가 나오지 않은 내 제안. MATCHED라도 **내 주문이 없으면** 다른 분이
  // 선택된 것이고, 미결제 시 매물이 다시 열려 내 제안이 다시 후보가 되므로(§1.4) 여기 남는다.
  const liveBidding = bidding.filter(
    (b) => b.status === "LIVE" || (b.status === "MATCHED" && orders[b.id] == null),
  );
  // 🔴 상태가 아니라 **주문 존재**로 판정한다(#419). isTopBidder가 §1.7로 사라졌고, 내 주문이
  // 있다는 것은 내가 구매자라는 사실 그 자체다. 상태로 가르면 결제 대기(MATCHED)가 빠져
  // **결제하기 버튼에 닿을 수 없다** — 실제로 그렇게 끊겨 있었다.
  const wonBidding = bidding.filter(
    (b) => (b.status === "MATCHED" || b.status === "ENDED_SOLD") && orders[b.id] != null,
  );

  // 모바일 메뉴의 빨간 배지 = "지금 내가 손봐야 하는 건수". 단순 개수(회색 값)와 구분한다.
  const needsAddress = (o: MyOrderStatusResponse) =>
    o.status === "PAID" && isBeforeShipment(o.fulfillmentStatus) && !o.hasDeliveryAddress;
  const purchaseActionCount = Object.values(orders).filter(
    (o) => needsAddress(o) || PURCHASE_ACTION_STATUSES.has(o.status),
  ).length;
  const shipmentActionCount = Object.values(soldOrders).filter(
    // 준비 중도 「손봐야 하는 건」이다 — 잠근 대가로 3영업일 발송 의무가 붙는다.
    (o) => o.orderStatus === "PAID" && isBeforeShipment(o.fulfillmentStatus),
  ).length;
  // 배송지가 비어 있는 결제완료 주문 — 모바일 메뉴에서 목록보다 먼저 세운다. 자동 팝업을 "나중에"로
  // 닫은 뒤에도 남아 있어야 하므로 dismissed 여부는 보지 않는다.
  const pendingAddressOrder = Object.values(orders).find(needsAddress) ?? null;
  const pendingAddress = pendingAddressOrder
    ? {
        auctionId: pendingAddressOrder.auctionId,
        title:
          [...bidding, ...instantPurchases].find((a) => a.id === pendingAddressOrder.auctionId)?.title
          ?? "구매 상품",
      }
    : null;

  const body = (
    <div className="mx-auto grid max-w-[1160px] gap-0 px-0 py-0 sm:gap-6 sm:px-4 sm:py-10 lg:grid-cols-[240px_1fr]">
      {addressModalOrder && (
        <DeliveryAddressModal
          auctionId={addressModalOrder.auctionId}
          auctionTitle={addressModalOrder.title}
          onClose={closeAddressModal}
          onSaved={handleAddressSaved}
        />
      )}
      {withdrawTarget && (
        <OfferWithdrawModal
          auctionId={withdrawTarget.auctionId}
          bidId={withdrawTarget.bidId}
          title={withdrawTarget.title}
          onClose={() => setWithdrawTarget(null)}
          onWithdrawn={handleOfferWithdrawn}
        />
      )}
      {reviewModalOrder && (
        <ReviewComposerModal
          orderId={reviewModalOrder.orderId}
          title={reviewModalOrder.title}
          sellerNickname={reviewModalOrder.sellerNickname}
          onClose={() => setReviewModalOrder(null)}
          onSaved={handleReviewSaved}
        />
      )}
      {/* 모바일 메뉴 목록 — `?tab=`이 없을 때만. 있으면 그 탭이 서브 화면으로 열린다. */}
      {tab === null && (
        <MobileMypageMenu
          nickname={member?.nickname ?? ""}
          trustLevel={member?.trustLevel ?? null}
          trustLevelLabel={member?.trustLevelLabel ? plainLevelLabel(member.trustLevelLabel) : null}
          tradeCount={member?.tradeCount ?? null}
          counts={{
            liveBidding: liveBidding.length,
            bidding: bidding.length,
            won: wonBidding.length,
            purchases: wonBidding.length + instantPurchases.length,
            selling: activeSelling.length,
            sellHistory: sellingHistory.length,
            wishlist: wishlist.length,
          }}
          purchaseActionCount={purchaseActionCount}
          shipmentActionCount={shipmentActionCount}
          pendingAddress={pendingAddress}
          onSelectTab={selectTab}
          onOpenAddress={openAddressModal}
          onLogout={handleLogout}
        />
      )}

      <aside className="hidden sm:block">
        <div className="rounded-r3 border border-border bg-surface p-5 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-xl font-extrabold text-primary">
            {member?.nickname.slice(0, 1).toUpperCase()}
          </span>
          <p className="mt-2.5 font-display text-sm font-extrabold text-text-1">{member?.nickname}</p>
          {/* 레벨·배지는 대시보드가 아니라 여기다(#275) — 어느 탭에 있든 보이는 자리라
              "나는 누구인가"에 해당하는 정보의 제자리다. 진행도 안내는 대시보드에 남긴다. */}
          {(member?.trustLevel != null || (member?.badges?.length ?? 0) > 0) && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              {member?.trustLevel != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-bold text-text-1">
                  <span className="text-text-3">Lv.{member.trustLevel}</span>
                  {member.trustLevelLabel ? plainLevelLabel(member.trustLevelLabel) : null}
                </span>
              )}
              <BadgeChips badges={member?.badges ?? []} />
            </div>
          )}
        </div>

        <div className="mt-4 rounded-r3 border border-border bg-surface p-2">
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-extrabold text-text-3">거래 관리</p>
          <nav aria-label="거래 관리 메뉴" className="flex flex-col">
            {TRADE_NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => selectTab(key)}
                className={`flex items-center gap-2.5 rounded-r2 px-2.5 py-2 text-left text-sm font-bold transition-colors ${FOCUS_RING} ${
                  activeTab === key ? "bg-primary-soft text-primary" : "text-text-2 hover:bg-surface-2"
                }`}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>

          <p className="mt-2 px-2.5 pb-1.5 pt-2 text-[11px] font-extrabold text-text-3">계정 관리</p>
          <nav aria-label="계정 관리 메뉴" className="flex flex-col">
            {ACCOUNT_NAV.filter((item) => !item.hidden).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => selectTab(key)}
                className={`flex items-center gap-2.5 rounded-r2 px-2.5 py-2 text-left text-sm font-bold transition-colors ${FOCUS_RING} ${
                  activeTab === key ? "bg-primary-soft text-primary" : "text-text-2 hover:bg-surface-2"
                }`}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-r3 border border-border-2 bg-surface py-2.5 text-sm font-bold text-text-2 ${FOCUS_RING}`}
        >
          <LogoutIcon />
          로그아웃
        </button>
      </aside>

      {/* 탭 본문 — 데스크탑은 늘, 모바일은 `?tab=`으로 열렸을 때만 보인다(트리는 한 벌). */}
      <div
        ref={contentRef}
        className={`scroll-mt-4 px-3.5 pt-3.5 sm:px-0 sm:pt-0 ${tab === null ? "hidden sm:block" : ""}`}
      >
        {error && (
          <p role="alert" className="mb-4 rounded-r2 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
            {error}
          </p>
        )}

        {STUB_TABS.has(activeTab) ? (
          <div className="flex flex-col items-center gap-2 rounded-r3 border border-dashed border-border-2 py-24 text-center">
            <h1 className="font-display text-lg font-extrabold text-text-1">{TAB_TITLE[activeTab]}</h1>
            <p className="text-sm text-text-3">
              {activeTab === "wishlist" ? "관심 목록 기능은 준비 중이에요." : "이 메뉴는 아직 준비 중이에요."}
            </p>
          </div>
        ) : activeTab === "dashboard" ? (
          <>
            <TabHead title="대시보드" sub={<>{member?.nickname}님, 좋은 포토카드와의 만남이 가득하길 바라요.</>} />

            {/* 위아래 규칙선 안에서 세로선으로만 나눈다 — 다섯 값이 한 덩어리로 읽혀야 비교가 된다. */}
            <div className="mt-5 flex flex-wrap gap-y-4 border-y border-border py-4">
              <DashboardStat label="참여 중인 거래" value={`${liveBidding.length}건`} />
              <DashboardStat label="제안한 매물" value={`${bidding.length}건`} />
              <DashboardStat label="거래 성사" value={`${wonBidding.length}건`} />
              <DashboardStat label="즉시구매" value={`${instantPurchases.length}건`} />
              <DashboardStat label="판매 중인 매물" value={`${activeSelling.length}건`} />
            </div>

            {/* 내 신뢰 레벨 진행도(§12.7) — 레벨·배지는 왼쪽 사용자 카드로 옮겼고(#275)
                여기는 "다음 레벨까지 얼마나"만 남긴다. 같은 정보를 두 곳에 두면 시선이 갈린다. */}
            {member?.trustLevel != null && (
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-r3 border border-border bg-surface p-4">
                <span className="text-xs text-text-3">거래 {member.tradeCount ?? 0}회</span>
                <span className="min-w-0 flex-1 text-xs text-text-2">
                  {member.levelCappedByTrust ? (
                    // 거래 요건은 넘었지만 신뢰도가 낮아 상한에 걸린 상태 — 거래를 더 하라고 안내하면 오해를 준다.
                    <>좋은 거래 후기를 쌓으면 레벨이 더 올라가요.</>
                  ) : member.nextLevelLabel ? (
                    <>
                      다음 레벨 <b className="font-bold text-text-1">{member.nextLevelLabel}</b>까지 거래{" "}
                      <b className="font-bold text-primary">{member.tradesToNextLevel ?? 0}회</b> 남았어요.
                    </>
                  ) : (
                    <>최고 레벨이에요. 덕질의 정점에 오르셨네요.</>
                  )}
                </span>
              </div>
            )}

            {reviewable.length > 0 && (
              <div className="mt-6 rounded-r3 border border-border bg-surface p-4">
                <p className="text-sm font-bold text-text-1">작성할 수 있는 거래 후기 {reviewable.length}건</p>
                <p className="mt-0.5 text-xs text-text-3">구매확정한 거래의 후기를 남겨 판매자에게 힘을 실어주세요.</p>
                <ul className="mt-3 flex flex-col divide-y divide-border/70">
                  {reviewable.map((r) => (
                    <li key={r.orderId} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-text-1">{r.title}</span>
                        <span className="block text-xs text-text-3">{r.sellerNickname ?? "판매자"}님과의 거래</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewModalOrder(r)}
                        className={`shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
                      >
                        후기 쓰기
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <DashboardPanel title="참여 중인 거래" onSeeAll={() => goToBidding("live")}>
                <MyBiddingList items={liveBidding.slice(0, 3)} loading={loading} emptyText="참여 중인 거래가 없습니다." orders={orders} onWithdrawOffer={openWithdrawModal} />
              </DashboardPanel>

              <DashboardPanel title="제안 내역" onSeeAll={() => goToBidding("all")}>
                <MyBiddingList items={bidding.slice(0, 3)} loading={loading} emptyText="아직 제안한 매물이 없어요." orders={orders} onWithdrawOffer={openWithdrawModal} />
              </DashboardPanel>

              <DashboardPanel title="구매 내역" onSeeAll={() => goToPurchases("auction")}>
                <MyBiddingList items={wonBidding.slice(0, 3)} loading={loading} emptyText="거래가 성사된 매물이 없습니다." orders={orders} onGoPayment={() => selectTab("payment")} onRefresh={loadMyActivity} onOpenAddressModal={openAddressModal} onConfirmed={handleConfirmed} />
              </DashboardPanel>

              <DashboardPanel title="즉시구매 내역" onSeeAll={() => goToPurchases("instant")}>
                <SellingList
                  items={instantPurchases.slice(0, 3)}
                  loading={loading}
                  emptyText="구매한 즉시판매가 없습니다."
                  endedLabel="구매 완료"
                  orders={orders}
                  onGoPayment={() => selectTab("payment")}
                  onRefresh={loadMyActivity}
                  onOpenAddressModal={openAddressModal}
                  onConfirmed={handleConfirmed}
                />
              </DashboardPanel>

              <DashboardPanel title="판매 중인 매물" onSeeAll={() => selectTab("selling")}>
                <SellingList
                  items={activeSelling.slice(0, 3)}
                  loading={loading}
                  emptyText="등록한 매물이 없습니다."
                  showReviewStatus
                  soldOrders={soldOrders}
                  onRefresh={loadMyActivity}
                />
              </DashboardPanel>
            </div>
          </>
        ) : activeTab === "bidding" ? (
          <>
            <TabHead title="가격 제안" sub={<>가격을 제안한 매물을 모아서 봐요.</>} />
            <FilterChips
              label="제안 목록 필터"
              value={biddingFilter}
              onChange={setBiddingFilter}
              options={[
                { key: "live", label: "진행 중", count: liveBidding.length },
                { key: "all", label: "전체", count: bidding.length },
              ]}
            />
            <div className="mt-5">
              <MyBiddingList
                items={biddingFilter === "live" ? liveBidding : bidding}
                loading={loading}
                emptyText={biddingFilter === "live" ? "참여 중인 거래가 없습니다." : "아직 제안한 매물이 없어요."}
                orders={orders}
                onGoPayment={() => selectTab("payment")}
                onWithdrawOffer={openWithdrawModal}
              />
            </div>
          </>
        ) : activeTab === "purchases" ? (
          <>
            <TabHead title="구매 내역" sub={<>제안으로 성사된 거래와 즉시구매를 한곳에서 봐요.</>} />
            <FilterChips
              label="구매 내역 필터"
              value={purchaseFilter}
              onChange={setPurchaseFilter}
              options={[
                { key: "auction", label: "제안 거래", count: wonBidding.length },
                { key: "instant", label: "즉시구매", count: instantPurchases.length },
              ]}
            />
            <div className="mt-5">
              {purchaseFilter === "auction" ? (
                <MyBiddingList items={wonBidding} loading={loading} emptyText="거래가 성사된 매물이 없습니다." orders={orders} onGoPayment={() => selectTab("payment")} onRefresh={loadMyActivity} onOpenAddressModal={openAddressModal} onConfirmed={handleConfirmed} />
              ) : (
                <SellingList
                  items={instantPurchases}
                  loading={loading}
                  emptyText="구매한 즉시판매가 없습니다."
                  endedLabel="구매 완료"
                  orders={orders}
                  onGoPayment={() => selectTab("payment")}
                  onRefresh={loadMyActivity}
                  onOpenAddressModal={openAddressModal}
                  onConfirmed={handleConfirmed}
                />
              )}
            </div>
          </>
        ) : activeTab === "selling" ? (
          <>
            <TabHead title="판매 중인 매물" sub={<>등록한 매물과 검수 상태 {activeSelling.length}건</>} />
            {loading ? (
              <p className="mt-6 text-sm text-text-3">불러오는 중...</p>
            ) : activeSelling.length === 0 ? (
              <p className="mt-6 text-sm text-text-3">
                아직 등록한 매물이 없어요.{" "}
                <Link href="/auctions/new" className={`font-bold text-primary hover:underline ${FOCUS_RING}`}>
                  판매 등록하기 →
                </Link>
              </p>
            ) : (
              <div className="mt-5">
                <SellingList
                  items={activeSelling}
                  loading={loading}
                  emptyText="등록한 매물이 없습니다."
                  showReviewStatus
                  showListingActions
                  soldOrders={soldOrders}
                  onRefresh={loadMyActivity}
                />
              </div>
            )}
          </>
        ) : activeTab === "profile" ? (
          <>
            <TabHead title="내 정보" sub={<>닉네임과 계정 정보를 확인하고 관리해요.</>} />
            <div className="mt-5">
              <ProfileTab />
            </div>
            {/*
              본인인증 진입점(#319). 기존 회원의 재인증 경로이자, 게이트가 꺼져 있는 동안
              인증 화면에 닿을 수 있는 유일한 길이다 — 온보딩은 required=false면 건너뛴다.

              제목은 패널이 아니라 여기서 준다(#321). 온보딩 화면은 h1이 「본인인증」이라
              패널이 제목을 들고 있으면 같은 말이 두 번 나온다.
            */}
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="text-sm font-bold text-text-1">본인인증</h2>
              <IdentityVerificationPanel className="mt-3" />
            </div>
          </>
        ) : activeTab === "shipping" ? (
          <>
            <TabHead title="배송지 관리" sub={<>구매한 상품을 받을 배송지를 관리해요.</>} />
            <div className="mt-5">
              <DeliveryAddressBook />
            </div>
          </>
        ) : activeTab === "payment" ? (
          <>
            <TabHead title="결제수단" sub={<>거래 성사 시 자동 결제에 사용할 카드를 관리해요.</>} />
            <div className="mt-5">
              <PaymentMethodManager />
            </div>
          </>
        ) : activeTab === "settlement" ? (
          <>
            <TabHead title="정산계좌" sub={<>판매 대금을 받을 계좌를 등록해요.</>} />
            <div className="mt-5">
              <BankAccountManager purpose="settlement" />
            </div>
          </>
        ) : activeTab === "refund" ? (
          <>
            <TabHead title="환불계좌" sub={<>거래가 취소되면 이 계좌로 돌려드려요.</>} />
            <div className="mt-5">
              <BankAccountManager purpose="refund" />
            </div>
          </>
        ) : activeTab === "settings" ? (
          <>
            <TabHead title="계정 설정" sub={<>계정을 관리해요.</>} />
            <div className="mt-5">
              <SettingsTab />
            </div>
          </>
        ) : activeTab === "wishlist" ? (
          <>
            <TabHead title="관심 목록" sub={<>찜한 매물 {wishlist.length}건</>} />
            {/* 관심 목록은 하단탭의 루트 화면이라 모바일에서도 제목을 갖는다(서브 화면 앱바가 없다). */}
            <div className="flex items-baseline gap-2 pt-0.5 sm:hidden">
              <h1 className="font-display text-xl font-extrabold text-text-1">관심 목록</h1>
              <span className="text-[12.5px] tabular-nums text-text-3">{wishlist.length}개</span>
            </div>
            {/* 지면이 갈리는 자리라 트리를 둘로 둔다 — 모바일은 킷대로 2열 카드, 데스크탑은 줄 목록. */}
            {wishlist.length > 0 ? (
              <div className="mt-3.5 grid grid-cols-2 gap-x-2 gap-y-[18px] sm:hidden">
                {wishlist.map((auction) => (
                  <AuctionCard
                    key={auction.id}
                    auction={auction}
                    wishlisted
                    onToggleWishlist={(next) => handleWishlistToggled(auction.id, next)}
                    variant="compact"
                  />
                ))}
              </div>
            ) : (
              !loading && (
                <p className="mt-8 text-center text-[13px] text-text-3 sm:hidden">
                  아직 찜한 매물이 없어요.
                </p>
              )
            )}
            <div className="mt-5 hidden sm:block">
              <WishlistTabList
                items={wishlist}
                loading={loading}
                emptyText="아직 찜한 매물이 없어요."
                onRemove={handleRemoveWishlist}
              />
            </div>
          </>
        ) : (
          <>
            <TabHead title="판매 내역" sub={<>종료되거나 취소된 매물 {sellingHistory.length}건</>} />
            <div className="mt-5">
              <SellingList
                items={sellingHistory}
                loading={loading}
                emptyText="판매 내역이 없습니다."
                showReviewStatus
                soldOrders={soldOrders}
                onRefresh={loadMyActivity}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );

  // 모바일 크롬은 두 갈래다. 하단탭이 직접 가리키는 화면(마이 목록·관심)은 **루트**라 앱 셸(상단
  // 워드마크 바 + 하단 5탭)을 쓰고, 나머지 탭은 **서브 화면**이라 앱바 하나로 들어가고 나온다.
  // 데스크탑에서는 둘 다 `sm:hidden`으로 접히므로 본문 트리는 그대로 하나다.
  if (tab === null || tab === "wishlist") {
    return <MobileShell active={tab === "wishlist" ? "관심" : "마이"}>{body}</MobileShell>;
  }
  return (
    <>
      {/* 뒤로는 히스토리가 아니라 목록 고정이다 — 알림·배너 딥링크로 곧장 들어온 경우에도
          나가는 길이 사이트 밖이 아니라 마이 목록이어야 한다. */}
      <MobilePageHead title={TAB_TITLE[activeTab]} backHref="/mypage" />
      {body}
    </>
  );
}

// useSearchParams()는 Suspense 경계 안에서만 쓸 수 있다(빌드 시 정적 최적화 요구사항).
export default function MyPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">
          마이페이지를 불러오는 중...
        </div>
      }
    >
      <MyPageBody />
    </Suspense>
  );
}

function Thumb({ url, alt }: { url: string | null; alt: string }) {
  return (
    <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-r2 bg-surface-2">
      {url && (
        // loading="lazy"는 목록 스크롤만을 위한 게 아니다. 모바일에서는 이 목록들이 통째로
        // 접혀 있는데(메뉴 화면), eager면 화면에 없는 썸네일 6장이 그대로 내려온다(#341과 같은 함정).
        // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
        <img src={mediaUrl(url)} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

/**
 * 대시보드 통계 한 칸(#296) — 관리자 대시보드(#294)와 같은 처리다.
 *
 * <p>예전에는 다섯 개가 각각 카드였다. 통계는 <b>서로 비교하는 값</b>이라 각자 껍데기에 갇힐 이유가
 * 없고, 모바일 2열에서는 카드 패딩 탓에 숫자가 잘렸다.
 *
 * <p>색 스와치도 뺐다 — 다섯 개에 서로 다른 파스텔을 물려 놨는데 <b>그 색이 아무 뜻도 없었다.</b>
 * 「참여 중인 거래」와 「즉시구매」가 같은 연보라였다.
 */
function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 basis-[112px] border-l border-border px-4 first:border-l-0 first:pl-0">
      <p className="text-xs font-bold text-text-3">{label}</p>
      <p className="mt-1 font-display text-lg font-extrabold tabular-nums text-text-1">{value}</p>
    </div>
  );
}

function DashboardPanel({
  title,
  onSeeAll,
  children,
}: {
  title: string;
  onSeeAll: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-r3 border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-extrabold text-text-1">{title}</h2>
        <button type="button" onClick={onSeeAll} className={`text-xs font-bold text-text-3 hover:text-primary ${FOCUS_RING}`}>
          전체 보기 →
        </button>
      </div>
      {children}
    </section>
  );
}

// 🔴 여기 있던 getSellerReviewBadge는 지웠다(#422) — 도트 배지를 걷으면서 tone이 필요 없어졌고,
// 「승인됨」이라는 라벨 자체가 사라졌다(남은 기간이 이미 그 말을 한다). 판매자에게 「반려」가 아니라
// 「보완 필요」로 말하는 규칙은 SELLER_AUCTION_STATUS_LABEL이 그대로 들고 있다.

function getSellerModerationReason(item: SellingListItem) {
  if (
    item.status === "REJECTED"
    && "reviewReason" in item
    && item.reviewReason?.trim()
  ) {
    return { label: "보완이 필요한 이유", text: item.reviewReason, inquiryTag: "승인 거절 문의" };
  }
  if (
    item.status === "CANCELLED"
    && "cancellationReason" in item
    && item.cancellationReason?.trim()
  ) {
    return { label: "취소 사유", text: item.cancellationReason, inquiryTag: "매물 취소 문의" };
  }
  return null;
}

function SellingList({
  items,
  loading,
  emptyText,
  endedLabel = "종료",
  showReviewStatus = false,
  orders,
  onGoPayment,
  soldOrders,
  onRefresh,
  onOpenAddressModal,
  onConfirmed,
  showListingActions = false,
}: {
  items: SellingListItem[];
  loading: boolean;
  emptyText: string;
  endedLabel?: string;
  showReviewStatus?: boolean;
  onOpenAddressModal?: (auctionId: number, title: string) => void;
  // 즉시구매 내역처럼 "내가 구매자"인 목록엔 orders(#113)를, 판매 목록엔 soldOrders(#119)를 넘긴다.
  orders?: Record<number, MyOrderStatusResponse>;
  onGoPayment?: () => void;
  soldOrders?: Record<number, SoldOrderResponse>;
  onRefresh?: () => void;
  onConfirmed?: (auctionId: number) => void;
  // 연장·최소가 수정은 「판매 중인 매물」 탭에서만 — 판매 내역(종료분)과 즉시구매 내역에는
  // 손댈 것이 없다. 목록 컴포넌트를 셋이 공유하므로 켜는 쪽에서만 켠다.
  showListingActions?: boolean;
}) {
  if (loading) return <p className="text-sm text-text-3">불러오는 중...</p>;
  if (items.length === 0) return <p className="text-sm text-text-3">{emptyText}</p>;

  // 🔴 카드에서 규칙선 행으로(#419). 항목마다 테두리를 두르면 열 개가 열 개의 상자가 되어
  // 눈이 쉴 곳이 없다 — 목록은 원래 표에 가깝고, 규칙선만 남기면 썸네일·제목·금액이 세로로
  // 정렬돼 훑기가 된다. 카드 131px → 행 72px(행동이 필요한 행만 108px).
  return (
    <ul className="border-t border-border">
      {items.map((item) => {
        const isLive = item.status === "LIVE";
        const displayPrice = item.saleType === "INSTANT" ? (item.buyNowPrice ?? item.startPrice) : item.startPrice;
        // 🔴 즉시판매를 「즉시판매」로 말하지 않는다(#422). 판매 유형은 바로 위 메타 줄이 이미
        // 말하고 있어서 한 행에 같은 단어가 두 번 나왔다 — 여기는 **상태**를 말하는 자리다.
        // 제안판매는 남은 기간이 곧 상태이고, 즉시판매는 기한이 없어 「판매 중」이 그 자리다.
        const timeLabel = isLive
          ? item.saleType === "INSTANT" || !item.endAt
            ? "판매 중"
            : formatTimeLeft(item.endAt)
          : endedLabel;
        // 🔴 도트 배지를 걷고 한 줄 텍스트로(#422). 배지가 「승인됨」을 말하고 그 아래 「3일 남음」이
        // 또 떠서 **같은 사실을 두 번** 말하고 있었다 — 승인된 매물은 판매 중이고, 남은 기간이
        // 그걸 이미 말한다. 그래서 「승인됨」이라는 말 자체를 없앴다.
        //
        // 검수가 아직 진행 중이거나 보완이 필요할 때만 그 사실을 말한다. 그 둘은 **판매자가
        // 손봐야 하는 상태**라 잉크색 굵게 올리고, 나머지는 회색으로 물러난다(제안 목록과 같은 규칙).
        const needsAttention =
          showReviewStatus && (item.status === "PENDING_REVIEW" || item.status === "REJECTED");
        const stateLabel = !needsAttention
          ? timeLabel
          : item.status === "REJECTED"
            ? SELLER_AUCTION_STATUS_LABEL.REJECTED
            : AUCTION_STATUS_LABEL.PENDING_REVIEW;
        const canOpenDetail = PUBLIC_DETAIL_STATUSES.has(item.status);
        const order = orders?.[item.id];
        const soldOrder = soldOrders?.[item.id];
        const moderationReason = getSellerModerationReason(item);
        // 🔴 제안 목록(MyBiddingList)과 같은 행 규칙을 쓴다(#422). 한 마이페이지 안에서 판매
        // 목록만 카드로 남으면 같은 화면이 두 디자인으로 갈린다. 아티스트명은 보라 제목이 아니라
        // 제목 아래 메타 줄이고, 상태는 오른쪽에서 금액 밑으로 붙는다.
        const summary = (
          <>
            <Thumb url={item.representativeThumbnailUrl} alt={item.title} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-bold text-text-1">{item.title}</span>
              <span className="mt-0.5 block truncate text-[11.5px] text-text-3">
                {item.artistName ? `${item.artistName} · ` : ""}
                {item.saleType === "INSTANT" ? "즉시판매" : "제안판매"}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-display text-[13.5px] font-bold tabular-nums text-text-1">
                {formatKRW(displayPrice)}
              </span>
              <span
                className={`mt-0.5 block text-[11.5px] ${
                  needsAttention ? "font-bold text-text-1" : "text-text-3"
                }`}
              >
                {stateLabel}
              </span>
            </span>
          </>
        );
        return (
          <li key={item.id} className="border-b border-border">
            <div className="py-3.5">
              {canOpenDetail ? (
                <Link href={`/auctions/${item.id}`} className={`flex items-start gap-3 rounded-r1 ${FOCUS_RING}`}>
                  {summary}
                </Link>
              ) : (
                <div className="flex items-start gap-3">{summary}</div>
              )}
              {moderationReason && (
                // 🔴 검수 반려 사유 — 목록에서 유일하게 「읽어야 하는」 블록이다(#422).
                // 회색 채움 대신 들여쓰기 + 헤어라인으로 지면을 나눈다. 카드가 사라진 자리에
                // 전폭 회색 블록이 남으면 행에서 떨어져 나온 것처럼 보인다.
                <div className="mt-2.5 border-t border-border pl-[56px] pt-2.5">
                  <p className="text-[11.5px] font-extrabold text-text-1">{moderationReason.label}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-text-2">
                    {moderationReason.text}
                  </p>
                  {/* 사유는 정해진 템플릿이라 개별 사정까지는 담기지 않는다 — 더 물어볼 게 있으면
                      1:1 문의로 보낸다(관리자와 판매자 사이의 유일한 양방향 창구). */}
                  <p className="mt-2 text-[11px] leading-5 text-text-3">
                    안내가 충분하지 않다면{" "}
                    <Link
                      href={`/inquiries/new?subject=${encodeURIComponent(`[${moderationReason.inquiryTag}] ${item.title}`)}`}
                      className={`font-bold text-primary underline underline-offset-2 ${FOCUS_RING}`}
                    >
                      1:1 문의
                    </Link>
                    로 문의해 주세요.
                  </p>
                </div>
              )}
              {/* 연장·최소가 수정(§1.3·§1.1) — 판매 중인 제안판매에만. 즉시판매는 기간이 없고
                  (마감 자체가 없다) 종료된 매물은 손댈 것이 없다. */}
              {showListingActions
                && isLive
                && item.saleType === "AUCTION"
                && "nextExtensionDays" in item && (
                  <SellingListingActions auction={item} onChanged={() => onRefresh?.()} />
                )}
              {/* 구매자(즉시구매) 관점: PAID면 배송/확정, 아니면 결제 상태. 판매자 관점: 발송 푸터. */}
              {order &&
                (order.status === "PAID" && onRefresh ? (
                  <BuyerFulfillmentFooter
                    order={order}
                    title={item.title}
                    onRefresh={onRefresh}
                    onOpenAddressModal={() => onOpenAddressModal?.(item.id, item.title)}
                    onConfirmed={onConfirmed}
                  />
                ) : onGoPayment ? (
                  <OrderStatusFooter order={order} onGoPayment={onGoPayment} />
                ) : null)}
              {soldOrder && onRefresh && (
                <SellerFulfillmentFooter soldOrder={soldOrder} onRefresh={onRefresh} />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function WishlistTabList({
  items,
  loading,
  emptyText,
  onRemove,
}: {
  items: AuctionResponse[];
  loading: boolean;
  emptyText: string;
  onRemove: (auctionId: number) => void;
}) {
  if (loading) return <p className="text-sm text-text-3">불러오는 중...</p>;
  if (items.length === 0) return <p className="text-sm text-text-3">{emptyText}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const isLive = item.status === "LIVE";
        const displayPrice = item.saleType === "INSTANT" ? (item.buyNowPrice ?? item.startPrice) : item.startPrice;
        const timeLabel = isLive
          ? item.saleType === "INSTANT" ? "즉시판매" : item.endAt ? formatTimeLeft(item.endAt) : "진행 중"
          : "종료";
        return (
          <li key={item.id}>
            <div className="flex items-center gap-3 rounded-r2 border border-border bg-surface p-2.5">
              <Link
                href={`/auctions/${item.id}`}
                className={`flex min-w-0 flex-1 items-center gap-3 ${FOCUS_RING}`}
              >
                <Thumb url={item.representativeThumbnailUrl} alt={item.title} />
                <span className="min-w-0 flex-1">
                  {item.artistName && (
                    <span className="block truncate text-[11px] font-extrabold text-primary">{item.artistName}</span>
                  )}
                  <span className="block truncate text-sm font-bold text-text-1">{item.title}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-sm font-extrabold text-text-1">
                    {formatKRW(displayPrice)}
                  </span>
                  <span className="block text-[10.5px] text-text-3">
                    {timeLabel}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label="관심 목록에서 제외"
                className={`shrink-0 rounded-full p-1.5 text-accent hover:bg-accent-soft ${FOCUS_RING}`}
              >
                <HeartIcon />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// 주문 결제 상태 푸터(#113, 승인 시안 v2) — 도트 인디케이터 + 안내문 + (필요 시) 액션 버튼.
// 색은 의미로만: 완료=ok, 조치 필요=accent, 재시도 대기=warn, 진행=primary, 취소=중립.
function OrderStatusFooter({
  order,
  onGoPayment,
}: {
  order: MyOrderStatusResponse;
  onGoPayment: () => void;
}) {
  const body = (() => {
    switch (order.status) {
      case "PAID":
        return {
          message: (
            <>결제 금액 <b className="font-bold text-text-1">{formatKRW(order.chargeAmount)}</b> · 수수료 포함</>
          ),
          action: null,
        };
      // A안(가상계좌·계좌이체)에서 이 상태는 "서버가 알아서 결제 중"이 아니라 **구매자가 결제할
      // 차례**다(FE #333). 예전 문구("등록된 카드로 자동 결제돼요")는 카드 자동캡처 시절의 것이고,
      // 카드 등록 화면이 은닉된 지금은 실행할 수도 없는 안내였다.
      case "PAYMENT_PENDING":
        return {
          message: (
            <>가상계좌·계좌이체로 결제해요 · <b className="font-bold text-text-1">{formatKRW(order.chargeAmount)}</b></>
          ),
          action: { label: "결제하기", solid: true, href: `/orders/${order.auctionId}/payment` },
        };
      case "PAYMENT_RETRYING":
        return {
          message: order.nextActionAt
            ? <>{formatDateTimeKST(order.nextActionAt)}에 다시 결제를 시도해요</>
            : <>잠시 후 다시 결제를 시도해요</>,
          action: { label: "카드 변경", solid: false },
        };
      case "SECOND_CHANCE_OFFERED":
        return {
          message: order.nextActionAt
            ? <>{formatDateTimeKST(order.nextActionAt)}까지 등록하면 자동 결제돼요</>
            : <>카드를 등록하면 자동 결제돼요</>,
          action: { label: "카드 등록", solid: true },
        };
      case "PAYMENT_DEFAULTED":
        return {
          message: <>기한 내 결제가 완료되지 않았어요</>,
          action: null,
        };
      // 환불(#173) — 취소·반품이 확정된 뒤 PG 취소를 기다리는 구간과 완료 구간.
      case "REFUNDING":
        return {
          message: (
            <>
              {order.refundReason ? `${REFUND_REASON_LABEL[order.refundReason]} · ` : ""}
              <b className="font-bold text-text-1">{formatKRW(order.refundAmount ?? order.chargeAmount)}</b> 환불을
              진행하고 있어요
            </>
          ),
          action: null,
        };
      case "REFUNDED":
        return {
          message: (
            <>
              <b className="font-bold text-text-1">{formatKRW(order.refundAmount ?? order.chargeAmount)}</b> 환불됐어요 ·
              카드사에 따라 반영까지 영업일이 걸릴 수 있어요
            </>
          ),
          action: null,
        };
      default:
        // PAYMENT_FAILED(예약값) 등 — 과거 데이터 호환 폴백.
        return {
          message: <>결제 상태를 확인해 주세요</>,
          action: null,
        };
    }
  })();

  return (
    // 🔴 회색 배경 띠와 상태 알약을 걷었다(#419). 알약 안에 원형 아이콘이 박혀 있어 상태 표시가
    // **토글처럼** 보였고(조작할 수 있는 것처럼), 카드마다 회색 띠가 붙어 모든 안내가 alert box가
    // 됐다. 상태는 위 행의 오른쪽 텍스트가 이미 말하므로 여기서는 **할 일과 버튼만** 남긴다 —
    // 그 행에서 유일하게 채워진 요소라 장치를 더 붙이지 않아도 눈에 걸린다.
    <div className="mt-2.5 flex flex-wrap items-center gap-3 pl-[56px] text-xs text-text-2">
      <span className="min-w-0 flex-1">{body.message}</span>
      {body.action &&
        // 결제창 경로는 별도 페이지라 링크로 나간다. 나머지(카드 등록·변경)는 기존처럼 탭 전환이다.
        (body.action.href ? (
          <Link
            href={body.action.href}
            className={`shrink-0 rounded-r1 bg-primary px-4 py-2 text-[12.5px] font-extrabold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
          >
            {body.action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onGoPayment}
            className={`shrink-0 rounded-r1 px-4 py-2 text-[12.5px] font-extrabold transition-colors ${FOCUS_RING} ${
              body.action.solid
                ? "bg-primary text-white hover:bg-primary-dark"
                : "border border-border-2 bg-surface text-text-2 hover:border-text-3 hover:text-text-1"
            }`}
          >
            {body.action.label}
          </button>
        ))}
    </div>
  );
}

// 🔴 알약 + 원형 아이콘 배지를 걷었다(#419) — 상태 표시가 토글처럼 보였다.
// 이름은 그대로 두어 호출부 20여 곳을 건드리지 않는다. 아이콘·톤 인자는 더 쓰지 않지만
// 시그니처를 유지해 다음 사람이 「왜 인자가 사라졌지」를 되묻지 않게 한다.
const fulfillmentPill = (_icon: string, _tone: StatusTone, label: string) => (
  <span className="shrink-0 text-[11.5px] font-bold text-text-1">{label}</span>
);

// 구매자 관점 배송/확정 푸터(#119) — 결제 완료(PAID) 주문에만. 배송지 입력(모달 트리거)·구매확정 포함.
function BuyerFulfillmentFooter({
  order,
  title,
  onRefresh,
  onOpenAddressModal,
  onConfirmed,
}: {
  order: MyOrderStatusResponse;
  title: string;
  onRefresh: () => void;
  onOpenAddressModal: () => void;
  onConfirmed?: (auctionId: number) => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  async function confirm() {
    if (confirming) return;
    setConfirming(true);
    try {
      await fetchWithAuth<void>(`/api/auctions/${order.auctionId}/order/confirm`, { method: "POST" });
      // 당근식 즉시 진입 — 확정 성공 직후 후기 모달을 띄운다(onConfirmed가 새로고침까지 겸함).
      if (onConfirmed) onConfirmed(order.auctionId);
      else onRefresh();
    } catch {
      // 실패는 조용히 — 다음 새로고침에서 서버 상태로 보정.
    } finally {
      setConfirming(false);
    }
  }

  // 발송 전 주문 취소(약관 제13조 제2항). 되돌릴 수 없으니 한 번 되묻는다.
  async function cancel() {
    if (cancelling) return;
    if (!window.confirm("주문을 취소하고 환불받을까요? 취소한 뒤에는 되돌릴 수 없어요.")) return;
    setCancelling(true);
    try {
      await fetchWithAuth<void>(`/api/auctions/${order.auctionId}/order/cancel`, { method: "POST" });
      onRefresh();
    } catch {
      // 실패는 조용히 — 다음 새로고침에서 서버 상태로 보정.
    } finally {
      setCancelling(false);
    }
  }

  const fs = order.fulfillmentStatus;

  // 반품이 열려 있으면 배송 상태보다 분쟁 단계가 우선 — 지금 내가 뭘 해야 하는지가 먼저다.
  if (order.disputeStatus !== "NONE" && order.disputeStatus !== "RESOLVED_DISMISSED") {
    return <BuyerDisputeFooter order={order} onRefresh={onRefresh} />;
  }

  return (
    // 결제 푸터와 같은 지면 규칙(#419) — 회색 띠 없이 썸네일 폭만큼 들여 쓴 행동 줄.
    <div className="mt-2.5 pl-[56px] text-xs text-text-2">
      {returnOpen && (
        <ReturnRequestModal
          auctionId={order.auctionId}
          title={title}
          onClose={() => setReturnOpen(false)}
          onDone={() => {
            setReturnOpen(false);
            onRefresh();
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        {fs === "CONFIRMED" ? (
          <>
            {fulfillmentPill("checkCircle", "ok", "구매 확정")}
            <span className="min-w-0 flex-1">거래가 완료됐어요.</span>
          </>
        ) : fs === "SHIPPED" ? (
          <>
            {order.deliveredAt
              ? fulfillmentPill("checkCircle", "ok", "배송 완료")
              : fulfillmentPill("box", "primary", "배송 중")}
            <span className="min-w-0 flex-1">
              {order.carrier} {order.trackingNumber}
              {order.deliveredAt ? " · 받으셨으면 구매 확정해 주세요" : ""}
            </span>
            {/* 반품은 구매확정 전에만 가능하다(약관 제15조 제2항) — 확정 버튼 옆에 나란히 둔다. */}
            {order.returnable && (
              <button
                type="button"
                onClick={() => setReturnOpen(true)}
                className={`shrink-0 rounded-r2 border border-border-2 bg-surface px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 ${FOCUS_RING}`}
              >
                반품 요청
              </button>
            )}
            <button
              type="button"
              onClick={confirm}
              disabled={confirming}
              className={`shrink-0 rounded-r2 bg-text-1 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-text-2 disabled:opacity-60 ${FOCUS_RING}`}
            >
              구매 확정
            </button>
          </>
        ) : fs === "PREPARING" ? (
          <>
            {/* 🔴 잠긴 뒤에는 취소 버튼이 아예 없다 — 눌리지 않는 버튼을 남기지 않는다.
                대신 「자동으로 환불돼요」를 말한다. 잠겼다는 사실만 남기면 「돈이 묶였는데
                방법이 없다」로 읽힌다(B3 알림과 같은 내용이 화면에도 있어야 한다). */}
            {fulfillmentPill("box", "primary", "물품 준비 중")}
            <span className="min-w-0 flex-1">
              판매자가 준비를 시작했어요 · <b className="font-bold text-text-1">3영업일</b> 안에 발송되지
              않으면 자동으로 환불돼요
            </span>
          </>
        ) : !order.hasDeliveryAddress ? (
          <>
            {fulfillmentPill("alertCircle", "accent", "배송지 입력 필요")}
            <span className="min-w-0 flex-1">받을 주소를 입력하면 판매자가 발송해요.</span>
            <button
              type="button"
              onClick={onOpenAddressModal}
              className={`shrink-0 rounded-r2 bg-text-1 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-text-2 ${FOCUS_RING}`}
            >
              배송지 입력
            </button>
          </>
        ) : (
          <>
            {fulfillmentPill("clock", "primary", "발송 대기")}
            {/* 🔴 남은 시간을 말한다(§1.5). 「지금은 취소된다」만 보여주면 내일 눌렀다가 안 되는
                순간에야 알게 된다. 잠기는 시각은 paidAt에서 계산한다 — 응답에 새 필드를 싣지 않는다. */}
            <span className="min-w-0 flex-1">
              판매자의 발송을 기다리고 있어요
              {order.cancellable && order.paidAt
                ? ` · ${formatTimeLeft(cancellationLocksAt(order.paidAt)).replace("남음", "뒤")}부터는 취소할 수 없어요`
                : ""}
            </span>
            {order.cancellable && (
              <button
                type="button"
                onClick={cancel}
                disabled={cancelling}
                className={`shrink-0 rounded-r2 border border-border-2 bg-surface px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-60 ${FOCUS_RING}`}
              >
                주문 취소
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// 반품이 열린 주문의 구매자 푸터(#213) — 배송 상태보다 "지금 내가 뭘 해야 하는지"가 먼저다.
// 각 단계에 기한이 걸려 있어(disputeDueAt) 언제까지인지를 함께 보여준다.
function BuyerDisputeFooter({
  order,
  onRefresh,
}: {
  order: MyOrderStatusResponse;
  onRefresh: () => void;
}) {
  const [shipOpen, setShipOpen] = useState(false);
  const due = order.disputeDueAt ? formatDateTimeKST(order.disputeDueAt) : null;

  const body = (() => {
    switch (order.disputeStatus) {
      case "RETURN_REQUESTED":
        return {
          pill: fulfillmentPill("clock", "primary", "반품 요청"),
          message: due ? (
            <>{due}까지 판매자가 응답해요 · 응답이 없으면 자동으로 수락돼요</>
          ) : (
            <>판매자의 응답을 기다리고 있어요</>
          ),
        };
      case "RETURN_ACCEPTED":
        return {
          pill: fulfillmentPill("box", "accent", "반송 필요"),
          message: due ? (
            <>반품이 수락됐어요 · {due}까지 반송하고 운송장을 등록해 주세요</>
          ) : (
            <>반품이 수락됐어요 · 물품을 반송하고 운송장을 등록해 주세요</>
          ),
        };
      case "RETURN_SHIPPED":
        return {
          pill: fulfillmentPill("box", "primary", "반송 중"),
          message: (
            <>
              {order.returnCarrier} {order.returnTrackingNumber} · 판매자 확인 후 환불돼요
            </>
          ),
        };
      case "UNDER_MEDIATION":
        return {
          pill: fulfillmentPill("alertCircle", "warn", "중재 진행"),
          message: <>운영진이 확인하고 있어요 · 결과를 알림으로 알려드릴게요</>,
        };
      case "RESOLVED_REFUND":
        return {
          pill: fulfillmentPill("checkCircle", "ok", "반품 완료"),
          message: <>반품이 확정돼 환불 절차가 진행돼요</>,
        };
      default:
        return {
          pill: fulfillmentPill("alertCircle", "neutral", "반품 확인 필요"),
          message: <>반품 상태를 확인해 주세요</>,
        };
    }
  })();

  return (
    // 회색 띠 없이 썸네일 폭만큼 들여 쓴 행동 줄(#422) — 목록 전체가 같은 지면 규칙을 쓴다.
    <div className="mt-2.5 pl-[56px] text-xs text-text-2">
      <div className="flex flex-wrap items-center gap-2.5">
        {body.pill}
        <span className="min-w-0 flex-1">{body.message}</span>
        {order.disputeStatus === "RETURN_ACCEPTED" && !shipOpen && (
          <button
            type="button"
            onClick={() => setShipOpen(true)}
            className={`shrink-0 rounded-r2 bg-text-1 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-text-2 ${FOCUS_RING}`}
          >
            반송 등록
          </button>
        )}
        {shipOpen && (
          <ReturnShipForm
            auctionId={order.auctionId}
            onShipped={() => {
              setShipOpen(false);
              onRefresh();
            }}
          />
        )}
      </div>
      {order.returnReason && (
        <p className="mt-1.5 text-[11px] text-text-3">
          사유 {RETURN_REASON_LABEL[order.returnReason]}
          {order.returnDetail ? ` · ${order.returnDetail}` : ""}
        </p>
      )}
      {order.disputeNote && order.disputeStatus === "UNDER_MEDIATION" && (
        <p className="mt-1 text-[11px] text-text-3">판매자 의견 · {order.disputeNote}</p>
      )}
    </div>
  );
}

// 판매자 관점 발송 푸터(#119) — 판매 내역. sold-order가 있으면(=결제 완료된 거래) 발송/상태 표시.
function SellerFulfillmentFooter({
  soldOrder,
  onRefresh,
}: {
  soldOrder: SoldOrderResponse;
  onRefresh: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [shipOpen, setShipOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const fs = soldOrder.fulfillmentStatus;
  const addr = soldOrder.deliveryAddress;

  /**
   * 「물품 준비」 — 이 순간부터 구매자 취소가 잠긴다(§1.5).
   *
   * 성공하면 목록을 다시 읽는다. 잠금과 함께 구매자 알림·미선택 제안자 통지가 서버에서 나가므로
   * 화면에서 상태를 흉내내지 않고 서버가 말하는 것을 그대로 받는다.
   */
  async function startPreparing() {
    setPreparing(true);
    try {
      await fetchWithAuth<void>(`/api/auctions/${soldOrder.auctionId}/order/prepare`, { method: "POST" });
      onRefresh();
    } catch {
      // 실패해도 화면을 흔들지 않는다 — 다시 누르면 된다(서버가 멱등이라 두 번 눌러도 안전하다).
    } finally {
      setPreparing(false);
    }
  }

  // 반품이 열려 있으면 발송 상태보다 반품 대응이 우선 — 판매자가 지금 눌러야 할 버튼이 여기 있다.
  if (soldOrder.disputeStatus !== "NONE" && soldOrder.disputeStatus !== "RESOLVED_DISMISSED") {
    return <SellerDisputeFooter soldOrder={soldOrder} onRefresh={onRefresh} />;
  }
  // 환불로 끝난 거래는 발송 UI를 띄우지 않는다(취소·미발송 자동취소 포함).
  if (soldOrder.orderStatus === "REFUNDING" || soldOrder.orderStatus === "REFUNDED") {
    return (
      <div className="mt-2.5 flex flex-wrap items-center gap-3 pl-[56px] text-xs text-text-2">
        {fulfillmentPill("xCircle", "neutral", "거래 취소")}
        <span className="min-w-0 flex-1">거래가 취소돼 구매자에게 환불됐어요 · 정산 대상이 아니에요.</span>
      </div>
    );
  }

  return (
    // 회색 띠 없이 썸네일 폭만큼 들여 쓴 행동 줄(#422) — 목록 전체가 같은 지면 규칙을 쓴다.
    <div className="mt-2.5 pl-[56px] text-xs text-text-2">
      <div className="flex flex-wrap items-center gap-2.5">
        {fs === "CONFIRMED" ? (
          <>
            {fulfillmentPill("checkCircle", "ok", "구매 확정")}
            <span className="min-w-0 flex-1">
              정산 예정 <b className="font-bold text-text-1">{formatKRW(soldOrder.payoutAmount)}</b> · 정산 준비 중
            </span>
          </>
        ) : fs === "SHIPPED" ? (
          <>
            {fulfillmentPill("box", "primary", "발송 완료")}
            <span className="min-w-0 flex-1">
              {soldOrder.carrier} {soldOrder.trackingNumber}
            </span>
          </>
        ) : addr ? (
          <>
            {fulfillmentPill(fs === "PREPARING" ? "box" : "clock", "accent",
              fs === "PREPARING" ? "물품 준비 중" : "발송 대기")}
            <span className="min-w-0 flex-1">
              {fs === "PREPARING" ? (
                <>
                  구매자 취소가 잠겼어요 · <b className="font-bold text-text-1">3영업일</b> 안에 보내주세요
                </>
              ) : (
                <>
                  {addr.recipientName} · {addr.address1} {addr.address2 ?? ""}
                </>
              )}
            </span>
            {/* 🔴 준비는 보조, 발송이 주요 행동이다 — 준비는 건너뛰어도 되고 발송이 실제로
                끝내는 일이다. 되돌리는 버튼은 두지 않는다: 풀 수 있게 만들면 구매자의
                취소권이 판매자 손에 붙었다 떨어졌다 한다. */}
            {fs !== "PREPARING" && (
              <button
                type="button"
                disabled={preparing}
                onClick={() => void startPreparing()}
                className={`shrink-0 rounded-r2 border border-border-2 bg-surface px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-60 ${FOCUS_RING}`}
              >
                물품 준비
              </button>
            )}
            <button
              type="button"
              onClick={() => setShipOpen((v) => !v)}
              className={`shrink-0 rounded-r2 bg-text-1 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-text-2 ${FOCUS_RING}`}
            >
              발송 처리
            </button>
          </>
        ) : (
          <>
            {fulfillmentPill("clock", "neutral", "배송지 대기")}
            <span className="min-w-0 flex-1">구매자가 배송지를 입력하면 발송할 수 있어요.</span>
          </>
        )}
      </div>
      {shipOpen && isBeforeShipment(fs) && addr && (
        <OrderShipForm
          auctionId={soldOrder.auctionId}
          onShipped={() => {
            setShipOpen(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// 반품이 열린 주문의 판매자 푸터(#213). 단계마다 판매자가 할 일이 다르다 —
// 요청 도착 시 수락/거절, 반송 도착 시 수령확인/훼손신고. 무응답은 자동 수락되므로 기한을 명시한다.
function SellerDisputeFooter({
  soldOrder,
  onRefresh,
}: {
  soldOrder: SoldOrderResponse;
  onRefresh: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  const due = soldOrder.disputeDueAt ? formatDateTimeKST(soldOrder.disputeDueAt) : null;

  // 거절·훼손신고는 사유가 필수다(관리자 중재의 판단 근거) — prompt로 받고 비면 중단한다.
  async function act(path: string, note?: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fetchWithAuth<void>(`/api/auctions/${soldOrder.auctionId}/order/return/${path}`, {
        method: "POST",
        body: note === undefined ? undefined : { note },
      });
      onRefresh();
    } catch {
      // 실패는 조용히 — 다음 새로고침에서 서버 상태로 보정.
    } finally {
      setBusy(false);
    }
  }

  function actWithNote(path: string, question: string) {
    const note = window.prompt(question)?.trim();
    if (!note) return;
    void act(path, note);
  }

  const outlineBtn = `shrink-0 rounded-r2 border border-border-2 bg-surface px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-60 ${FOCUS_RING}`;
  const solidBtn = `shrink-0 rounded-r2 bg-text-1 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-text-2 disabled:opacity-60 ${FOCUS_RING}`;

  const body = (() => {
    switch (soldOrder.disputeStatus) {
      case "RETURN_REQUESTED":
        return {
          pill: fulfillmentPill("alertCircle", "accent", "반품 요청"),
          message: due ? (
            <>{due}까지 응답해 주세요 · 응답이 없으면 자동으로 수락돼요</>
          ) : (
            <>구매자가 반품을 요청했어요</>
          ),
          actions: (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => actWithNote("reject", "반품을 거절하는 사유를 적어주세요. 운영진 중재의 판단 근거가 돼요.")}
                className={outlineBtn}
              >
                거절
              </button>
              <button type="button" disabled={busy} onClick={() => void act("accept")} className={solidBtn}>
                수락
              </button>
            </>
          ),
        };
      case "RETURN_ACCEPTED":
        return {
          pill: fulfillmentPill("clock", "primary", "반송 대기"),
          message: due ? <>{due}까지 구매자가 반송해요</> : <>구매자의 반송을 기다리고 있어요</>,
          actions: null,
        };
      case "RETURN_SHIPPED":
        return {
          pill: fulfillmentPill("box", "accent", "반송 도착 확인"),
          message: (
            <>
              {soldOrder.returnCarrier} {soldOrder.returnTrackingNumber}
              {due ? ` · ${due}까지 확인하지 않으면 자동 환불돼요` : ""}
            </>
          ),
          actions: (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => actWithNote("damaged", "어떤 점이 훼손됐는지 적어주세요. 운영진 중재로 넘어가요.")}
                className={outlineBtn}
              >
                훼손 신고
              </button>
              <button type="button" disabled={busy} onClick={() => void act("receive")} className={solidBtn}>
                수령 확인
              </button>
            </>
          ),
        };
      case "UNDER_MEDIATION":
        return {
          pill: fulfillmentPill("alertCircle", "warn", "중재 진행"),
          message: <>운영진이 확인하고 있어요 · 결과를 알림으로 알려드릴게요</>,
          actions: null,
        };
      case "RESOLVED_REFUND":
        return {
          pill: fulfillmentPill("xCircle", "neutral", "반품 완료"),
          message: <>반품이 확정돼 구매자에게 환불돼요 · 정산 대상이 아니에요</>,
          actions: null,
        };
      default:
        return {
          pill: fulfillmentPill("alertCircle", "neutral", "반품 확인 필요"),
          message: <>반품 상태를 확인해 주세요</>,
          actions: null,
        };
    }
  })();

  return (
    // 회색 띠 없이 썸네일 폭만큼 들여 쓴 행동 줄(#422) — 목록 전체가 같은 지면 규칙을 쓴다.
    <div className="mt-2.5 pl-[56px] text-xs text-text-2">
      <div className="flex flex-wrap items-center gap-2.5">
        {body.pill}
        <span className="min-w-0 flex-1">{body.message}</span>
        {body.actions}
      </div>
      {soldOrder.returnReason && (
        <p className="mt-1.5 text-[11px] text-text-3">
          사유 {RETURN_REASON_LABEL[soldOrder.returnReason]}
          {soldOrder.returnDetail ? ` · ${soldOrder.returnDetail}` : ""}
        </p>
      )}
    </div>
  );
}

function MyBiddingList({
  items,
  loading,
  emptyText,
  orders,
  onGoPayment,
  onRefresh,
  onOpenAddressModal,
  onConfirmed,
  onWithdrawOffer,
}: {
  items: MyBiddingResponse[];
  loading: boolean;
  emptyText: string;
  // 성사된 거래의 주문 상태(auctionId 키) — 넘기면 카드 하단에 결제 상태 푸터가 붙는다(#113).
  orders?: Record<number, MyOrderStatusResponse>;
  onGoPayment?: () => void;
  onRefresh?: () => void;
  onOpenAddressModal?: (auctionId: number, title: string) => void;
  onConfirmed?: (auctionId: number) => void;
  onWithdrawOffer?: (item: MyBiddingResponse) => void;
}) {
  if (loading) return <p className="text-sm text-text-3">불러오는 중...</p>;
  if (items.length === 0) return <p className="text-sm text-text-3">{emptyText}</p>;

  return (
    <ul className="border-t border-border">
      {items.map((item) => {
        const isLive = item.status === "LIVE";
        const order = orders?.[item.id];
        // 🔴 MATCHED 하나로는 「내가 선택됐다」와 「다른 분이 선택됐다」가 갈리지 않는다(#419).
        // 주문이 있으면 내가 구매자이고, 없으면 남이 골라진 것이다 — 그때 내 제안은 아직 살아
        // 있어서 미결제 시 다시 후보가 되므로(§1.4) 「끝났다」로 읽히면 안 된다.
        // 취소는 「내 제안이 아직 살아 있고(ACTIVE) 매물이 그 철회를 받는 상태」일 때만이다.
        // ACCEPTED면 계약이 성립해 취소가 막히고(§9.1), 종료된 매물은 바꿀 것이 없다.
        const canWithdraw =
          item.myOfferStatus === "ACTIVE" &&
          item.myOfferId != null &&
          (item.status === "LIVE" || item.status === "MATCHED");
        const stateLabel = isLive
          ? formatTimeLeft(item.endAt)
          : item.status === "MATCHED" && !order
            ? "다른 제안이 선택됨"
            : (AUCTION_STATUS_LABEL[item.status] ?? "종료");
        return (
          <li key={item.id} className="border-b border-border">
            {/* 행동 줄에 버튼이 들어가므로 행 전체를 Link로 감싸지 않는다(중첩 인터랙티브 방지). */}
            <div className="group py-3.5">
              <Link
                href={`/auctions/${item.id}`}
                className={`flex items-start gap-3 rounded-r1 ${FOCUS_RING}`}
              >
                <Thumb url={item.representativeThumbnailUrl} alt={item.title} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-text-1">{item.title}</span>
                  {/* 🔴 아티스트명을 보라 굵은 글씨에서 이 메타 줄로 내렸다(#419).
                      「보라는 상태를 말하는 자리에만 — 제목에는 쓰지 않는다」는 규칙을 어기고
                      있었고, 목록에서 가장 먼저 읽혀야 할 것은 매물 제목이지 아티스트가 아니다. */}
                  <span className="mt-0.5 block truncate text-[11.5px] text-text-3">
                    {item.artistName ? `${item.artistName} · ` : ""}
                    최소가 {formatKRW(item.startPrice)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {/* 오른쪽 큰 숫자를 「내 제안가」로 올렸다 — 예전에는 현재가(=최고 제안가)였는데
                      그 값이 사라졌고, 이 화면에서 사용자가 가장 알고 싶은 건 자기가 낸 금액이다. */}
                  {/* 전부 거둬들이면 금액이 없다 — 그때는 「취소함」이라고 말한다.
                      0원을 그리면 「0원에 제안했다」로 읽힌다. */}
                  <span className="block font-display text-[13.5px] font-bold tabular-nums text-text-1">
                    {item.myBidAmount == null ? "취소함" : formatKRW(item.myBidAmount)}
                  </span>
                  {/* 손볼 것이 있는 상태만 잉크색으로 올린다 — 나머지는 회색으로 물러난다. */}
                  <span
                    className={`mt-0.5 block text-[11.5px] ${
                      order || item.status === "MATCHED" ? "font-bold text-text-1" : "text-text-3"
                    }`}
                  >
                    {stateLabel}
                  </span>
                </span>
              </Link>
              {/* 🔴 제안 철회·수정 줄(§1.2, #428). 상태마다 할 수 있는 일이 다르다.
                  · ACTIVE + 진행 중  → 금액 수정 · 제안 취소
                  · ACTIVE + 성사대기 → 제안 취소만. 아직 유효해서 미결제 시 재선택된다(§1.8)
                  · ACCEPTED         → 아무것도 없다. 선택된 제안은 취소할 수 없고(§9.1) 빠지는
                                        길은 주문 취소다 — 아래 주문 푸터가 그 자리를 맡는다.
                  버튼을 「눌리지만 서버가 거절하는」 상태로 두지 않는다. 그건 잘못된 안내다. */}
              {canWithdraw && (
                <div className="mt-2.5 flex items-center gap-2 pl-[56px]">
                  <span className="flex-1 text-[11.5px] leading-relaxed text-text-3">
                    {isLive
                      ? "판매자가 선택하기 전까지 바꾸거나 거둬들일 수 있어요."
                      : "아직 유효해요. 결제가 이뤄지지 않으면 다시 선택될 수 있어요."}
                  </span>
                  {isLive && (
                    <Link href={`/auctions/${item.id}`} className={OFFER_ACTION_CLASS}>
                      금액 수정
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => onWithdrawOffer?.(item)}
                    className={`${OFFER_ACTION_CLASS} hover:!border-accent hover:!text-accent`}
                  >
                    제안 취소
                  </button>
                </div>
              )}
              {/* 성사된 거래도 PAID면 배송지 입력·구매확정 푸터, 그 전이면 결제 상태 푸터(#113/#119). */}
              {order &&
                (order.status === "PAID" && onRefresh ? (
                  <BuyerFulfillmentFooter
                    order={order}
                    title={item.title}
                    onRefresh={onRefresh}
                    onOpenAddressModal={() => onOpenAddressModal?.(item.id, item.title)}
                    onConfirmed={onConfirmed}
                  />
                ) : onGoPayment ? (
                  <OrderStatusFooter order={order} onGoPayment={onGoPayment} />
                ) : null)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
