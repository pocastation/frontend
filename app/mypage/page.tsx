"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW, formatTimeLeft } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type {
  AuctionListResponse,
  AuctionResponse,
  MyBiddingListResponse,
  MyBiddingResponse,
  WishlistListResponse,
} from "@/lib/types";

type Tab =
  | "dashboard"
  | "participating"
  | "bidHistory"
  | "won"
  | "selling"
  | "sellHistory"
  | "wishlist"
  | "profile"
  | "notifications"
  | "shipping"
  | "settings";

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
function ReceiptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8h6M9 12h6" />
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
  { key: "participating", label: "참여 중인 경매", icon: TicketIcon },
  { key: "bidHistory", label: "입찰 내역", icon: ReceiptIcon },
  { key: "won", label: "낙찰/구매 내역", icon: BadgeCheckIcon },
  { key: "selling", label: "판매 중인 경매", icon: TagIcon },
  { key: "sellHistory", label: "판매 내역", icon: ArchiveIcon },
  { key: "wishlist", label: "관심 목록", icon: HeartIcon },
];

const ACCOUNT_NAV: { key: Tab; label: string; icon: () => ReactNode }[] = [
  { key: "profile", label: "내 정보", icon: UserIcon },
  { key: "notifications", label: "알림 설정", icon: BellIcon },
  { key: "shipping", label: "배송지 관리", icon: PinIcon },
  { key: "settings", label: "계정 설정", icon: GearIcon },
];

const TAB_TITLE: Record<Tab, string> = {
  dashboard: "대시보드",
  participating: "참여 중인 경매",
  bidHistory: "입찰 내역",
  won: "낙찰/구매 내역",
  selling: "판매 중인 경매",
  sellHistory: "판매 내역",
  wishlist: "관심 목록",
  profile: "내 정보",
  notifications: "알림 설정",
  shipping: "배송지 관리",
  settings: "계정 설정",
};

// 도메인이 아직 없는 탭(계정 관리 전반)은 준비 중 안내만 보여준다 — 클릭했을 때 아무 반응
// 없는 죽은 메뉴보다는, 메뉴는 다 보여주고 상태를 정직하게 알리는 쪽을 택했다.
// 관심 목록은 wishlist 도메인이 생겨 실제 데이터로 전환됨(더 이상 스텁 아님).
const STUB_TABS = new Set<Tab>(["profile", "notifications", "shipping", "settings"]);

// 당근식 통합 마이페이지 — 판매자/구매자 계정 구분 없이 "내 활동" = 판매 + 입찰.
export default function MyPage() {
  const router = useRouter();
  const { accessToken, member, isLoading, fetchWithAuth, logout } = useAuth();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [selling, setSelling] = useState<AuctionResponse[]>([]);
  const [bidding, setBidding] = useState<MyBiddingResponse[]>([]);
  const [wishlist, setWishlist] = useState<AuctionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMyActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sellingRes, biddingRes, wishlistRes] = await Promise.all([
        fetchWithAuth<AuctionListResponse>("/api/members/me/selling?size=50"),
        fetchWithAuth<MyBiddingListResponse>("/api/members/me/bidding?size=50"),
        fetchWithAuth<WishlistListResponse>("/api/members/me/wishlist?size=50"),
      ]);
      setSelling(sellingRes.content);
      setBidding(biddingRes.content);
      setWishlist(wishlistRes.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "내 활동을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

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

  const liveSelling = selling.filter((a) => a.status === "LIVE");
  const liveBidding = bidding.filter((b) => b.status === "LIVE");
  const wonBidding = bidding.filter((b) => b.status === "ENDED_SOLD" && b.isTopBidder);

  return (
    <div className="mx-auto grid max-w-[1160px] gap-6 px-4 py-8 sm:py-10 lg:grid-cols-[240px_1fr]">
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

      <div>
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

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DashboardStat label="참여 중인 경매" value={`${liveBidding.length}건`} swatch="bg-primary-soft" />
              <DashboardStat label="입찰한 경매" value={`${bidding.length}건`} swatch="bg-accent-soft" />
              <DashboardStat label="낙찰 성공" value={`${wonBidding.length}건`} swatch="bg-ok-soft" />
              <DashboardStat label="판매 중인 경매" value={`${liveSelling.length}건`} swatch="bg-surface-3" />
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <DashboardPanel title="참여 중인 경매" onSeeAll={() => setTab("participating")}>
                <MyBiddingList items={liveBidding.slice(0, 3)} loading={loading} emptyText="참여 중인 경매가 없습니다." />
              </DashboardPanel>

              <DashboardPanel title="입찰 내역" onSeeAll={() => setTab("bidHistory")}>
                <MyBiddingList items={bidding.slice(0, 3)} loading={loading} emptyText="아직 입찰한 경매가 없어요." />
              </DashboardPanel>

              <DashboardPanel title="낙찰/구매 내역" onSeeAll={() => setTab("won")}>
                <MyBiddingList items={wonBidding.slice(0, 3)} loading={loading} emptyText="낙찰한 경매가 없습니다." />
              </DashboardPanel>

              <DashboardPanel title="판매 중인 경매" onSeeAll={() => setTab("selling")}>
                <SellingList items={liveSelling.slice(0, 3)} loading={loading} emptyText="판매 중인 경매가 없습니다." />
              </DashboardPanel>
            </div>
          </>
        ) : tab === "participating" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">참여 중인 경매</h1>
            <p className="mt-1 text-sm text-text-3">진행 중인 경매 {liveBidding.length}건</p>
            <div className="mt-5">
              <MyBiddingList items={liveBidding} loading={loading} emptyText="참여 중인 경매가 없습니다." />
            </div>
          </>
        ) : tab === "bidHistory" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">입찰 내역</h1>
            <p className="mt-1 text-sm text-text-3">입찰에 참여한 경매 {bidding.length}건</p>
            <div className="mt-5">
              <MyBiddingList items={bidding} loading={loading} emptyText="아직 입찰한 경매가 없어요." />
            </div>
          </>
        ) : tab === "won" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">낙찰/구매 내역</h1>
            <p className="mt-1 text-sm text-text-3">낙찰한 경매 {wonBidding.length}건</p>
            <div className="mt-5">
              <MyBiddingList items={wonBidding} loading={loading} emptyText="낙찰한 경매가 없습니다." />
            </div>
          </>
        ) : tab === "selling" ? (
          <>
            <h1 className="font-display text-xl font-extrabold text-text-1">판매 중인 경매</h1>
            <p className="mt-1 text-sm text-text-3">판매 중인 경매 {liveSelling.length}건</p>
            {loading ? (
              <p className="mt-6 text-sm text-text-3">불러오는 중...</p>
            ) : liveSelling.length === 0 ? (
              <p className="mt-6 text-sm text-text-3">
                아직 등록한 경매가 없어요.{" "}
                <Link href="/auctions/new" className={`font-bold text-primary hover:underline ${FOCUS_RING}`}>
                  판매 등록하기 →
                </Link>
              </p>
            ) : (
              <div className="mt-5">
                <SellingList items={liveSelling} loading={loading} emptyText="판매 중인 경매가 없습니다." />
              </div>
            )}
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
            <p className="mt-1 text-sm text-text-3">등록한 경매 {selling.length}건</p>
            <div className="mt-5">
              <SellingList items={selling} loading={loading} emptyText="아직 등록한 경매가 없어요." />
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

function SellingList({
  items,
  loading,
  emptyText,
}: {
  items: AuctionResponse[];
  loading: boolean;
  emptyText: string;
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
            <Link
              href={`/auctions/${item.id}`}
              className={`flex items-center gap-3 rounded-r2 border border-border bg-surface p-2.5 transition-colors hover:border-primary ${FOCUS_RING}`}
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

function MyBiddingList({
  items,
  loading,
  emptyText,
}: {
  items: MyBiddingResponse[];
  loading: boolean;
  emptyText: string;
}) {
  if (loading) return <p className="text-sm text-text-3">불러오는 중...</p>;
  if (items.length === 0) return <p className="text-sm text-text-3">{emptyText}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const isLive = item.status === "LIVE";
        return (
          <li key={item.id}>
            <Link
              href={`/auctions/${item.id}`}
              className={`flex items-center gap-3 rounded-r3 border border-border bg-surface p-3 transition-colors hover:border-primary ${FOCUS_RING}`}
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
          </li>
        );
      })}
    </ul>
  );
}
