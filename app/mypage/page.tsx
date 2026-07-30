"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import DeliveryAddressBook from "@/components/DeliveryAddressBook";
import PaymentMethodManager from "@/components/PaymentMethodManager";
import ProfileTab from "@/components/ProfileTab";
import SettingsTab from "@/components/SettingsTab";
import NotificationSettings from "@/components/NotificationSettings";
import DeliveryAddressModal from "@/components/DeliveryAddressModal";
import ReviewComposerModal from "@/components/ReviewComposerModal";
import OrderShipForm from "@/components/OrderShipForm";
import ReturnRequestModal from "@/components/ReturnRequestModal";
import ReturnShipForm from "@/components/ReturnShipForm";
import { StatusIconCircle, type StatusTone } from "@/components/StatusIcon";
import { formatDateTimeKST, formatKRW, formatTimeLeft } from "@/lib/format";
import {
  AUCTION_STATUS_BADGE_CLASS,
  AUCTION_STATUS_LABEL,
  SELLER_AUCTION_STATUS_LABEL,
  REFUND_REASON_LABEL,
  RETURN_REASON_LABEL,
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

const SELLING_TAB_STATUSES = new Set<AuctionResponse["status"]>([
  "PENDING_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "LIVE",
  "REJECTED",
]);

const PUBLIC_DETAIL_STATUSES = new Set<AuctionResponse["status"]>([
  "LIVE",
  "ENDED_SOLD",
  "ENDED_NO_BIDS",
  "CANCELLED",
]);

type SellingListItem = AuctionResponse | MySellingAuctionResponse;

// 메뉴가 13개까지 늘어나 스캔이 어려워져, 같은 성격의 화면을 한 탭 + 내부 필터로 합쳤다.
// - bidding("입찰"): 예전 participating(진행 중) + bidHistory(전체)
// - purchases("구매 내역"): 예전 won(경매 낙찰) + instantPurchases(즉시구매)
// 예전 키로 들어오는 딥링크(/mypage?tab=won 등)는 LEGACY_TAB_ALIAS로 흡수한다.
type Tab =
  | "dashboard"
  | "bidding"
  | "purchases"
  | "selling"
  | "sellHistory"
  | "wishlist"
  | "profile"
  | "notifications"
  | "shipping"
  | "payment"
  | "settings";

// 합쳐진 탭 안에서 어느 묶음을 보고 있는지.
type BiddingFilter = "live" | "all";
type PurchaseFilter = "auction" | "instant";

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
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
  { key: "bidding", label: "입찰", icon: TicketIcon },
  { key: "purchases", label: "구매 내역", icon: BadgeCheckIcon },
  { key: "selling", label: "판매 중인 경매", icon: TagIcon },
  { key: "sellHistory", label: "판매 내역", icon: ArchiveIcon },
  { key: "wishlist", label: "관심 목록", icon: HeartIcon },
];

const ACCOUNT_NAV: { key: Tab; label: string; icon: () => ReactNode }[] = [
  { key: "profile", label: "내 정보", icon: UserIcon },
  { key: "notifications", label: "알림 설정", icon: BellIcon },
  { key: "shipping", label: "배송지 관리", icon: PinIcon },
  { key: "payment", label: "결제수단", icon: CardIcon },
  { key: "settings", label: "계정 설정", icon: GearIcon },
];

const TAB_TITLE: Record<Tab, string> = {
  dashboard: "대시보드",
  bidding: "입찰",
  purchases: "구매 내역",
  selling: "판매 중인 경매",
  sellHistory: "판매 내역",
  wishlist: "관심 목록",
  profile: "내 정보",
  notifications: "알림 설정",
  shipping: "배송지 관리",
  payment: "결제수단",
  settings: "계정 설정",
};

// 아직 준비 중인 탭만 안내를 보여준다 — 현재 남은 스텁 없음(계정 설정은 회원 탈퇴로 실구현됨).
const STUB_TABS = new Set<Tab>([]);

// /mypage?tab= 쿼리 검증용 — 존재하는 탭 키만 허용.
const TAB_KEYS = new Set<Tab>([...TRADE_NAV, ...ACCOUNT_NAV].map((item) => item.key));

// 탭을 합치기 전 키로 들어오는 기존 링크·북마크를 새 탭(+내부 필터)으로 흘려보낸다.
const LEGACY_TAB_ALIAS: Record<string, { tab: Tab; bidding?: BiddingFilter; purchase?: PurchaseFilter }> = {
  participating: { tab: "bidding", bidding: "live" },
  bidHistory: { tab: "bidding", bidding: "all" },
  won: { tab: "purchases", purchase: "auction" },
  instantPurchases: { tab: "purchases", purchase: "instant" },
};

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
    <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={`h-9 rounded-r2 border px-3.5 text-[13px] font-bold transition-colors ${FOCUS_RING} ${
            value === option.key
              ? "border-primary bg-primary text-white"
              : "border-border-2 bg-white text-text-2 hover:border-primary hover:text-primary"
          }`}
        >
          {option.label}
          <span className="ml-1.5 tabular-nums opacity-70">{option.count}</span>
        </button>
      ))}
    </div>
  );
}

// 당근식 통합 마이페이지 — 판매자/구매자 계정 구분 없이 "내 활동" = 판매 + 입찰.
export default function MyPage() {
  const router = useRouter();
  const { accessToken, member, isLoading, fetchWithAuth, logout } = useAuth();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [biddingFilter, setBiddingFilter] = useState<BiddingFilter>("live");
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>("auction");

  // 대시보드 패널의 "전체 보기"는 합쳐진 탭으로 가되, 그 패널이 보여주던 묶음이 선택된 채로 열려야 한다.
  function goToBidding(filter: BiddingFilter) {
    setBiddingFilter(filter);
    setTab("bidding");
  }
  function goToPurchases(filter: PurchaseFilter) {
    setPurchaseFilter(filter);
    setTab("purchases");
  }
  // 모바일에선 메뉴(aside)가 콘텐츠 위에 쌓여, 탭을 눌러도 콘텐츠가 화면 밖 아래에서 바뀌어
  // "아무 반응 없어" 보인다. 탭이 바뀌면(초기 진입 제외) 콘텐츠로 스크롤해준다(lg 미만).
  const contentRef = useRef<HTMLDivElement>(null);
  const firstTabRender = useRef(true);
  const [selling, setSelling] = useState<MySellingAuctionResponse[]>([]);
  const [bidding, setBidding] = useState<MyBiddingResponse[]>([]);
  const [instantPurchases, setInstantPurchases] = useState<AuctionResponse[]>([]);
  const [wishlist, setWishlist] = useState<AuctionResponse[]>([]);
  // 구매(낙찰·즉시구매) 건의 주문 결제 상태 — auctionId 키(#113, wishlist 하트 배치 채움 패턴).
  const [orders, setOrders] = useState<Record<number, MyOrderStatusResponse>>({});
  // 판매 건의 주문(판매자 관점, #119) — auctionId 키. 발송 UI가 소비.
  const [soldOrders, setSoldOrders] = useState<Record<number, SoldOrderResponse>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 낙찰 후 배송지 입력 팝업(§13 "배송지 자동채움") — 기본배송지가 없어 자동확정 못한 주문을
  // 마이페이지 진입 즉시 모달로 띄운다. 사용자가 "나중에"로 닫으면 이번 세션에선 다시 안 띄운다.
  const [addressModalOrder, setAddressModalOrder] = useState<{ auctionId: number; title: string } | null>(null);
  const dismissedAddressIds = useRef<Set<number>>(new Set());
  // 거래 리뷰(§12.6) — 작성 가능한(구매확정 후 14일 내 미작성) 주문 목록 + 작성 모달 대상.
  const [reviewable, setReviewable] = useState<ReviewableOrderResponse[]>([]);
  const [reviewModalOrder, setReviewModalOrder] = useState<ReviewableOrderResponse | null>(null);

  // 알림·주문 상태 푸터의 CTA가 /mypage?tab=payment 로 진입할 수 있게 쿼리를 1회 반영한다.
  // (탭이 로컬 state뿐이라 SSR 초기값으로 읽으면 하이드레이션이 어긋난다 — 마운트 후 전환.)
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (!requested) return;
    if (TAB_KEYS.has(requested as Tab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 쿼리는 마운트 후에만 읽을 수 있다.
      setTab(requested as Tab);
      return;
    }
    const alias = LEGACY_TAB_ALIAS[requested];
    if (alias) {
      setTab(alias.tab);
      if (alias.bidding) setBiddingFilter(alias.bidding);
      if (alias.purchase) setPurchaseFilter(alias.purchase);
    }
  }, []);

  useEffect(() => {
    if (firstTabRender.current) {
      firstTabRender.current = false;
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

      // 구매 확정 건(낙찰 + 즉시구매)의 주문 상태를 배치로 채운다 — 주문이 없는 경매는 응답에 안 온다.
      // 배치 채움 실패는 non-fatal: 목록은 그대로 보여주고 상태 푸터만 생략한다(wishlist 하트와 동일 원칙).
      const purchasedIds = [
        ...biddingRes.content.filter((b) => b.status === "ENDED_SOLD" && b.isTopBidder).map((b) => b.id),
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

      // 판매 건의 주문(발송 UI) — 판매자 관점. 주문이 없는(미낙찰·미결제) 경매는 응답에 안 온다.
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

  // 배송지 미확정(기본배송지 없이 낙찰) 주문이 있으면 진입 즉시 팝업 — 이미 열려있거나 이번
  // 세션에 "나중에"로 닫은 주문은 다시 띄우지 않는다.
  useEffect(() => {
    if (addressModalOrder) return;
    const pending = Object.values(orders).find(
      (o) =>
        o.status === "PAID" &&
        o.fulfillmentStatus === "AWAITING_SHIPMENT" &&
        !o.hasDeliveryAddress &&
        !dismissedAddressIds.current.has(o.auctionId),
    );
    if (!pending) return;
    const auction = [...bidding, ...instantPurchases].find((a) => a.id === pending.auctionId);
    setAddressModalOrder({ auctionId: pending.auctionId, title: auction?.title ?? "낙찰 상품" });
  }, [orders, bidding, instantPurchases, addressModalOrder]);

  function openAddressModal(auctionId: number, title: string) {
    setAddressModalOrder({ auctionId, title });
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
  const liveBidding = bidding.filter((b) => b.status === "LIVE");
  const wonBidding = bidding.filter((b) => b.status === "ENDED_SOLD" && b.isTopBidder);

  return (
    <div className="mx-auto grid max-w-[1160px] gap-6 px-4 py-8 sm:py-10 lg:grid-cols-[240px_1fr]">
      {addressModalOrder && (
        <DeliveryAddressModal
          auctionId={addressModalOrder.auctionId}
          auctionTitle={addressModalOrder.title}
          onClose={closeAddressModal}
          onSaved={handleAddressSaved}
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
      <aside>
        <div className="rounded-r3 border border-border bg-surface p-5 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-xl font-extrabold text-primary">
            {member?.nickname.slice(0, 1).toUpperCase()}
          </span>
          <p className="mt-2.5 font-display text-sm font-extrabold text-text-1">{member?.nickname}</p>
        </div>

        <div className="mt-4 rounded-r3 border border-border bg-surface p-2 shadow-card">
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-extrabold text-text-3">거래 관리</p>
          <nav aria-label="거래 관리 메뉴" className="flex flex-col">
            {TRADE_NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center gap-2.5 rounded-r2 px-2.5 py-2 text-left text-sm font-bold transition-colors ${FOCUS_RING} ${
                  tab === key ? "bg-primary-soft text-primary" : "text-text-2 hover:bg-surface-2"
                }`}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>

          <p className="mt-2 px-2.5 pb-1.5 pt-2 text-[11px] font-extrabold text-text-3">계정 관리</p>
          <nav aria-label="계정 관리 메뉴" className="flex flex-col">
            {ACCOUNT_NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center gap-2.5 rounded-r2 px-2.5 py-2 text-left text-sm font-bold transition-colors ${FOCUS_RING} ${
                  tab === key ? "bg-primary-soft text-primary" : "text-text-2 hover:bg-surface-2"
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

      <div ref={contentRef} className="scroll-mt-4">
        {error && (
          <p role="alert" className="mb-4 rounded-r2 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
            {error}
          </p>
        )}

        {STUB_TABS.has(tab) ? (
          <div className="flex flex-col items-center gap-2 rounded-r3 border border-dashed border-border-2 py-24 text-center">
            <h1 className="font-display text-lg font-extrabold text-text-1">{TAB_TITLE[tab]}</h1>
            <p className="text-sm text-text-3">
              {tab === "wishlist" ? "관심 목록 기능은 준비 중이에요." : "이 메뉴는 아직 준비 중이에요."}
            </p>
          </div>
        ) : tab === "dashboard" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">대시보드</h1>
            <p className="mt-1 text-sm text-text-3">{member?.nickname}님, 좋은 포토카드와의 만남이 가득하길 바라요.</p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <DashboardStat label="참여 중인 경매" value={`${liveBidding.length}건`} swatch="bg-primary-soft" />
              <DashboardStat label="입찰한 경매" value={`${bidding.length}건`} swatch="bg-accent-soft" />
              <DashboardStat label="낙찰 성공" value={`${wonBidding.length}건`} swatch="bg-ok-soft" />
              <DashboardStat label="즉시구매" value={`${instantPurchases.length}건`} swatch="bg-primary-soft" />
              <DashboardStat label="판매 중인 경매" value={`${activeSelling.length}건`} swatch="bg-surface-3" />
            </div>

            {/* 내 신뢰 레벨(§12.7) — 점수 숫자는 서버가 내려주지 않으므로 레벨·거래수·진행도만 표시. */}
            {member?.trustLevel != null && (
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-r3 border border-border bg-surface p-4 shadow-card">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-bold text-text-1">
                  <span className="text-text-3">Lv.{member.trustLevel}</span>
                  {member.trustLevelLabel}
                </span>
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
              <div className="mt-6 rounded-r3 border border-border bg-surface p-4 shadow-card">
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
              <DashboardPanel title="참여 중인 경매" onSeeAll={() => goToBidding("live")}>
                <MyBiddingList items={liveBidding.slice(0, 3)} loading={loading} emptyText="참여 중인 경매가 없습니다." />
              </DashboardPanel>

              <DashboardPanel title="입찰 내역" onSeeAll={() => goToBidding("all")}>
                <MyBiddingList items={bidding.slice(0, 3)} loading={loading} emptyText="아직 입찰한 경매가 없어요." />
              </DashboardPanel>

              <DashboardPanel title="낙찰/구매 내역" onSeeAll={() => goToPurchases("auction")}>
                <MyBiddingList items={wonBidding.slice(0, 3)} loading={loading} emptyText="낙찰한 경매가 없습니다." orders={orders} onGoPayment={() => setTab("payment")} onRefresh={loadMyActivity} onOpenAddressModal={openAddressModal} onConfirmed={handleConfirmed} />
              </DashboardPanel>

              <DashboardPanel title="즉시구매 내역" onSeeAll={() => goToPurchases("instant")}>
                <SellingList
                  items={instantPurchases.slice(0, 3)}
                  loading={loading}
                  emptyText="구매한 즉시판매가 없습니다."
                  endedLabel="구매 완료"
                  orders={orders}
                  onGoPayment={() => setTab("payment")}
                  onRefresh={loadMyActivity}
                  onOpenAddressModal={openAddressModal}
                  onConfirmed={handleConfirmed}
                />
              </DashboardPanel>

              <DashboardPanel title="판매 중인 경매" onSeeAll={() => setTab("selling")}>
                <SellingList
                  items={activeSelling.slice(0, 3)}
                  loading={loading}
                  emptyText="등록한 경매가 없습니다."
                  showReviewStatus
                  soldOrders={soldOrders}
                  onRefresh={loadMyActivity}
                />
              </DashboardPanel>
            </div>
          </>
        ) : tab === "bidding" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">입찰</h1>
            <p className="mt-1 text-sm text-text-3">입찰에 참여한 경매를 모아서 봐요.</p>
            <FilterChips
              label="입찰 목록 필터"
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
                emptyText={biddingFilter === "live" ? "참여 중인 경매가 없습니다." : "아직 입찰한 경매가 없어요."}
              />
            </div>
          </>
        ) : tab === "purchases" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">구매 내역</h1>
            <p className="mt-1 text-sm text-text-3">경매 낙찰과 즉시구매를 한곳에서 봐요.</p>
            <FilterChips
              label="구매 내역 필터"
              value={purchaseFilter}
              onChange={setPurchaseFilter}
              options={[
                { key: "auction", label: "경매 낙찰", count: wonBidding.length },
                { key: "instant", label: "즉시구매", count: instantPurchases.length },
              ]}
            />
            <div className="mt-5">
              {purchaseFilter === "auction" ? (
                <MyBiddingList items={wonBidding} loading={loading} emptyText="낙찰한 경매가 없습니다." orders={orders} onGoPayment={() => setTab("payment")} onRefresh={loadMyActivity} onOpenAddressModal={openAddressModal} onConfirmed={handleConfirmed} />
              ) : (
                <SellingList
                  items={instantPurchases}
                  loading={loading}
                  emptyText="구매한 즉시판매가 없습니다."
                  endedLabel="구매 완료"
                  orders={orders}
                  onGoPayment={() => setTab("payment")}
                  onRefresh={loadMyActivity}
                  onOpenAddressModal={openAddressModal}
                  onConfirmed={handleConfirmed}
                />
              )}
            </div>
          </>
        ) : tab === "selling" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">판매 중인 경매</h1>
            <p className="mt-1 text-sm text-text-3">등록한 경매와 검수 상태 {activeSelling.length}건</p>
            {loading ? (
              <p className="mt-6 text-sm text-text-3">불러오는 중...</p>
            ) : activeSelling.length === 0 ? (
              <p className="mt-6 text-sm text-text-3">
                아직 등록한 경매가 없어요.{" "}
                <Link href="/auctions/new" className={`font-bold text-primary hover:underline ${FOCUS_RING}`}>
                  판매 등록하기 →
                </Link>
              </p>
            ) : (
              <div className="mt-5">
                <SellingList
                  items={activeSelling}
                  loading={loading}
                  emptyText="등록한 경매가 없습니다."
                  showReviewStatus
                  soldOrders={soldOrders}
                  onRefresh={loadMyActivity}
                />
              </div>
            )}
          </>
        ) : tab === "profile" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">내 정보</h1>
            <p className="mt-1 text-sm text-text-3">닉네임과 계정 정보를 확인하고 관리해요.</p>
            <div className="mt-5">
              <ProfileTab />
            </div>
          </>
        ) : tab === "shipping" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">배송지 관리</h1>
            <p className="mt-1 text-sm text-text-3">낙찰 상품을 받을 배송지를 관리해요.</p>
            <div className="mt-5">
              <DeliveryAddressBook />
            </div>
          </>
        ) : tab === "payment" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">결제수단</h1>
            <p className="mt-1 text-sm text-text-3">낙찰 시 자동 결제에 사용할 카드를 관리해요.</p>
            <div className="mt-5">
              <PaymentMethodManager />
            </div>
          </>
        ) : tab === "notifications" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">알림 설정</h1>
            <p className="mt-1 text-sm text-text-3">어떤 알림을 받을지 설정해요.</p>
            <div className="mt-5">
              <NotificationSettings />
            </div>
          </>
        ) : tab === "settings" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">계정 설정</h1>
            <p className="mt-1 text-sm text-text-3">계정을 관리해요.</p>
            <div className="mt-5">
              <SettingsTab />
            </div>
          </>
        ) : tab === "wishlist" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">관심 목록</h1>
            <p className="mt-1 text-sm text-text-3">찜한 경매 {wishlist.length}건</p>
            <div className="mt-5">
              <WishlistTabList
                items={wishlist}
                loading={loading}
                emptyText="아직 찜한 경매가 없어요."
                onRemove={handleRemoveWishlist}
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">판매 내역</h1>
            <p className="mt-1 text-sm text-text-3">종료되거나 취소된 경매 {sellingHistory.length}건</p>
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
}

function Thumb({ url, alt }: { url: string | null; alt: string }) {
  return (
    <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-r2 bg-surface-2">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
        <img src={mediaUrl(url)} alt={alt} className="h-full w-full object-cover" />
      )}
    </span>
  );
}

function DashboardStat({ label, value, swatch }: { label: string; value: string; swatch: string }) {
  return (
    <div className="rounded-r3 border border-border bg-surface p-4 shadow-card">
      <span className={`mb-2.5 block h-2 w-6 rounded-full ${swatch}`} aria-hidden="true" />
      <p className="text-xs font-bold text-text-3">{label}</p>
      <p className="mt-1.5 font-display text-lg font-extrabold text-text-1">{value}</p>
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
    <section className="rounded-r3 border border-border bg-surface p-4 shadow-card">
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

function getSellerReviewBadge(status: AuctionResponse["status"]) {
  if (status === "PENDING_REVIEW") {
    return { label: AUCTION_STATUS_LABEL.PENDING_REVIEW, className: AUCTION_STATUS_BADGE_CLASS.PENDING_REVIEW };
  }
  if (status === "REJECTED") {
    // 판매자에게는 "반려"가 아니라 "보완 필요" — 고쳐서 다시 등록할 수 있는 흐름이다.
    return { label: SELLER_AUCTION_STATUS_LABEL.REJECTED, className: AUCTION_STATUS_BADGE_CLASS.REJECTED };
  }
  if (status === "APPROVED" || status === "SCHEDULED" || status === "LIVE") {
    return { label: "승인됨", className: AUCTION_STATUS_BADGE_CLASS[status] };
  }
  return null;
}

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
}) {
  if (loading) return <p className="text-sm text-text-3">불러오는 중...</p>;
  if (items.length === 0) return <p className="text-sm text-text-3">{emptyText}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const isLive = item.status === "LIVE";
        const displayPrice = item.saleType === "INSTANT" ? (item.buyNowPrice ?? item.currentPrice) : item.currentPrice;
        const timeLabel = isLive
          ? item.saleType === "INSTANT" ? "즉시판매" : item.endAt ? formatTimeLeft(item.endAt) : "진행 중"
          : endedLabel;
        const reviewBadge = showReviewStatus ? getSellerReviewBadge(item.status) : null;
        const canOpenDetail = PUBLIC_DETAIL_STATUSES.has(item.status);
        const order = orders?.[item.id];
        const soldOrder = soldOrders?.[item.id];
        const moderationReason = getSellerModerationReason(item);
        const summary = (
          <>
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
              {reviewBadge ? (
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-bold ${reviewBadge.className}`}>
                  {reviewBadge.label}
                </span>
              ) : (
                <span className="block text-[10.5px] text-text-3">{timeLabel}</span>
              )}
              {reviewBadge && isLive && (
                <span className="mt-0.5 block text-[10px] text-text-3">{timeLabel}</span>
              )}
            </span>
          </>
        );
        return (
          <li key={item.id}>
            <div className="overflow-hidden rounded-r2 border border-border bg-surface transition-colors hover:border-primary">
              {canOpenDetail ? (
                <Link href={`/auctions/${item.id}`} className={`flex items-center gap-3 p-2.5 ${FOCUS_RING}`}>
                  {summary}
                </Link>
              ) : (
                <div className="flex items-center gap-3 p-2.5">{summary}</div>
              )}
              {moderationReason && (
                <div className="border-t border-border bg-surface-2 px-3 py-2.5">
                  <p className="text-[11px] font-extrabold text-text-2">{moderationReason.label}</p>
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
        const displayPrice = item.saleType === "INSTANT" ? (item.buyNowPrice ?? item.currentPrice) : item.currentPrice;
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

const BID_STATUS_LABEL: Record<string, string> = {
  ENDED_SOLD: "낙찰 종료",
  ENDED_NO_BIDS: "유찰",
  SCHEDULED: "시작 예정",
};

// 주문 결제 상태 푸터(#113, 승인 시안 v2) — 도트 인디케이터 + 안내문 + (필요 시) 액션 버튼.
// 색은 의미로만: 완료=ok, 조치 필요=accent, 재시도 대기=warn, 진행=primary, 취소=중립.
function OrderStatusFooter({
  order,
  onGoPayment,
}: {
  order: MyOrderStatusResponse;
  onGoPayment: () => void;
}) {
  const pill = (icon: string, tone: StatusTone, label: string) => (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-[11px] font-bold text-text-2">
      <StatusIconCircle name={icon} tone={tone} size="h-[18px] w-[18px]" glyph="text-[11px]" />
      {label}
    </span>
  );
  const body = (() => {
    switch (order.status) {
      case "PAID":
        return {
          pill: pill("card", "ok", "결제 완료"),
          message: (
            <>결제 금액 <b className="font-bold text-text-1">{formatKRW(order.chargeAmount)}</b> · 수수료 포함</>
          ),
          action: null,
        };
      case "PAYMENT_PENDING":
        return {
          pill: pill("clock", "primary", "결제 진행 중"),
          message: (
            <>등록된 카드로 자동 결제돼요 · 예상 <b className="font-bold text-text-1">{formatKRW(order.chargeAmount)}</b></>
          ),
          action: null,
        };
      case "PAYMENT_RETRYING":
        return {
          pill: pill("clock", "warn", "재시도 예정"),
          message: order.nextActionAt
            ? <>{formatDateTimeKST(order.nextActionAt)}에 다시 결제를 시도해요</>
            : <>잠시 후 다시 결제를 시도해요</>,
          action: { label: "카드 변경", solid: false },
        };
      case "SECOND_CHANCE_OFFERED":
        return {
          pill: pill("alertCircle", "accent", "카드 등록 필요"),
          message: order.nextActionAt
            ? <>{formatDateTimeKST(order.nextActionAt)}까지 등록하면 자동 결제돼요</>
            : <>카드를 등록하면 자동 결제돼요</>,
          action: { label: "카드 등록", solid: true },
        };
      case "PAYMENT_DEFAULTED":
        return {
          pill: pill("xCircle", "neutral", "주문 취소"),
          message: <>기한 내 결제가 완료되지 않았어요</>,
          action: null,
        };
      // 환불(#173) — 취소·반품이 확정된 뒤 PG 취소를 기다리는 구간과 완료 구간.
      case "REFUNDING":
        return {
          pill: pill("clock", "primary", "환불 처리 중"),
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
          pill: pill("checkCircle", "ok", "환불 완료"),
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
          pill: pill("alertCircle", "neutral", "결제 확인 필요"),
          message: <>결제 상태를 확인해 주세요</>,
          action: null,
        };
    }
  })();

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-t border-border/60 bg-surface-2/40 px-3 py-2.5 text-xs text-text-2">
      {body.pill}
      <span className="min-w-0 flex-1">{body.message}</span>
      {body.action && (
        <button
          type="button"
          onClick={onGoPayment}
          className={`shrink-0 rounded-r2 px-3 py-1.5 text-[11px] font-bold transition-colors ${FOCUS_RING} ${
            body.action.solid
              ? "bg-text-1 text-white hover:bg-text-2"
              : "border border-border-2 bg-surface text-text-2 hover:border-text-3 hover:text-text-1"
          }`}
        >
          {body.action.label}
        </button>
      )}
    </div>
  );
}

const fulfillmentPill = (icon: string, tone: StatusTone, label: string) => (
  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-[11px] font-bold text-text-2">
    <StatusIconCircle name={icon} tone={tone} size="h-[18px] w-[18px]" glyph="text-[11px]" />
    {label}
  </span>
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
    <div className="border-t border-border/60 bg-surface-2/40 px-3 py-2.5 text-xs text-text-2">
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
            <span className="min-w-0 flex-1">판매자의 발송을 기다리고 있어요.</span>
            {/* 발송 전에는 구매자가 스스로 취소할 수 있다(약관 제13조 제2항). */}
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
    <div className="border-t border-border/60 bg-surface-2/40 px-3 py-2.5 text-xs text-text-2">
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

// 판매자 관점 발송 푸터(#119) — 판매 내역. sold-order가 있으면(=결제 완료된 낙찰) 발송/상태 표시.
function SellerFulfillmentFooter({
  soldOrder,
  onRefresh,
}: {
  soldOrder: SoldOrderResponse;
  onRefresh: () => void;
}) {
  const [shipOpen, setShipOpen] = useState(false);
  const fs = soldOrder.fulfillmentStatus;
  const addr = soldOrder.deliveryAddress;

  // 반품이 열려 있으면 발송 상태보다 반품 대응이 우선 — 판매자가 지금 눌러야 할 버튼이 여기 있다.
  if (soldOrder.disputeStatus !== "NONE" && soldOrder.disputeStatus !== "RESOLVED_DISMISSED") {
    return <SellerDisputeFooter soldOrder={soldOrder} onRefresh={onRefresh} />;
  }
  // 환불로 끝난 거래는 발송 UI를 띄우지 않는다(취소·미발송 자동취소 포함).
  if (soldOrder.orderStatus === "REFUNDING" || soldOrder.orderStatus === "REFUNDED") {
    return (
      <div className="flex flex-wrap items-center gap-2.5 border-t border-border/60 bg-surface-2/40 px-3 py-2.5 text-xs text-text-2">
        {fulfillmentPill("xCircle", "neutral", "거래 취소")}
        <span className="min-w-0 flex-1">거래가 취소돼 구매자에게 환불됐어요 · 정산 대상이 아니에요.</span>
      </div>
    );
  }

  return (
    <div className="border-t border-border/60 bg-surface-2/40 px-3 py-2.5 text-xs text-text-2">
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
            {fulfillmentPill("clock", "accent", "발송 대기")}
            <span className="min-w-0 flex-1">
              {addr.recipientName} · {addr.address1} {addr.address2 ?? ""}
            </span>
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
      {shipOpen && fs === "AWAITING_SHIPMENT" && addr && (
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
    <div className="border-t border-border/60 bg-surface-2/40 px-3 py-2.5 text-xs text-text-2">
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
}: {
  items: MyBiddingResponse[];
  loading: boolean;
  emptyText: string;
  // 낙찰 건의 주문 상태(auctionId 키) — 넘기면 카드 하단에 결제 상태 푸터가 붙는다(#113).
  orders?: Record<number, MyOrderStatusResponse>;
  onGoPayment?: () => void;
  onRefresh?: () => void;
  onOpenAddressModal?: (auctionId: number, title: string) => void;
  onConfirmed?: (auctionId: number) => void;
}) {
  if (loading) return <p className="text-sm text-text-3">불러오는 중...</p>;
  if (items.length === 0) return <p className="text-sm text-text-3">{emptyText}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const isLive = item.status === "LIVE";
        const order = orders?.[item.id];
        return (
          <li key={item.id}>
            {/* 푸터에 버튼이 들어가므로 카드 전체를 Link로 감싸지 않는다(중첩 인터랙티브 방지). */}
            <div className="overflow-hidden rounded-r3 border border-border bg-surface transition-colors hover:border-primary">
              <Link
                href={`/auctions/${item.id}`}
                className={`flex items-center gap-3 p-3 ${FOCUS_RING}`}
              >
                <Thumb url={item.representativeThumbnailUrl} alt={item.title} />
                <span className="min-w-0 flex-1">
                  {item.artistName && (
                    <span className="block truncate text-[11px] font-extrabold text-primary">{item.artistName}</span>
                  )}
                  <span className="block truncate text-sm font-bold text-text-1">{item.title}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11px] text-text-3">
                    <span>내 입찰가 {formatKRW(item.myBidAmount)}</span>
                    {item.isTopBidder && item.status === "LIVE" && (
                      <span className="rounded-full bg-ok-soft px-1.5 py-0.5 font-bold text-ok">최고 입찰가</span>
                    )}
                    {item.isTopBidder && item.status === "ENDED_SOLD" && (
                      <span className="rounded-full bg-ok-soft px-1.5 py-0.5 font-bold text-ok">낙찰 완료</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-sm font-extrabold text-text-1">
                    {formatKRW(item.currentPrice)}
                  </span>
                  <span className="block text-[10.5px] text-text-3">
                    {isLive ? formatTimeLeft(item.endAt) : (BID_STATUS_LABEL[item.status] ?? "종료")}
                  </span>
                </span>
              </Link>
              {/* 낙찰 건도 PAID면 배송지 입력·구매확정 푸터, 그 전이면 결제 상태 푸터(#113/#119). */}
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
