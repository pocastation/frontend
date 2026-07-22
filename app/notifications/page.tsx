"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUS_TONE_CLASS, StatusGlyph, type StatusTone } from "@/components/StatusIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notification-context";
import { formatRelativeTime } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type { NotificationListResponse, NotificationResponse, NotificationType } from "@/lib/types";

// 타입별 표기 — 카테고리 아이콘(공용 StatusIcon) + 의미색 톤.
// 톤: 진행성=primary, 완료·낙찰=ok(그린), 실패·지연=accent(레드), 종료·취소=중립.
const TYPE_META: Record<NotificationType, { label: string; tone: StatusTone; icon: string }> = {
  OUTBID: { label: "입찰 추월", tone: "primary", icon: "trendingUp" },
  AUCTION_WON: { label: "낙찰", tone: "ok", icon: "award" },
  AUCTION_LOST: { label: "패찰", tone: "neutral", icon: "minus" },
  AUCTION_ENDED_NO_BIDS: { label: "유찰", tone: "neutral", icon: "minus" },
  PAYMENT_COMPLETED: { label: "결제 완료", tone: "ok", icon: "card" },
  PAYMENT_FAILED: { label: "결제 실패", tone: "accent", icon: "alertCircle" },
  ORDER_DEFAULTED: { label: "주문 취소", tone: "neutral", icon: "xCircle" },
  AUCTION_SUCCEEDED: { label: "구매 기회", tone: "primary", icon: "tag" },
  ORDER_SHIPPED: { label: "발송", tone: "primary", icon: "box" },
  ORDER_CONFIRMED: { label: "구매 확정", tone: "ok", icon: "checkCircle" },
  SHIPPING_OVERDUE: { label: "발송 지연", tone: "accent", icon: "clock" },
  SETTLEMENT_COMPLETED: { label: "정산 완료", tone: "ok", icon: "card" },
  INQUIRY_ANSWERED: { label: "문의 답변", tone: "ok", icon: "checkCircle" },
};

// 배포 시점 차이로 프론트가 모르는 타입이 와도 렌더가 깨지지 않게 폴백.
const UNKNOWN_META: { label: string; tone: StatusTone; icon: string } = { label: "알림", tone: "neutral", icon: "minus" };

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { accessToken, isLoading, fetchWithAuth } = useAuth();
  const { refresh: refreshBell } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchWithAuth<NotificationListResponse>(
        `/api/members/me/notifications?page=0&size=${PAGE_SIZE}`,
      );
      setNotifications(res.content);
      setPage(0);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "알림을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  // 다음 페이지를 이어붙인다(기존 목록 유지 — AuctionBrowser와 같은 "더 보기" 패턴).
  async function handleLoadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetchWithAuth<NotificationListResponse>(
        `/api/members/me/notifications?page=${nextPage}&size=${PAGE_SIZE}`,
      );
      setNotifications((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "알림을 더 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = page + 1 < totalPages;

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) {
      router.replace("/login?redirect=/notifications");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 인증 확정 후 알림함을 동기화한다.
    void load();
  }, [accessToken, isLoading, load, router]);

  const hasUnread = notifications.some((n) => !n.isRead);

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetchWithAuth<void>("/api/members/me/notifications/read-all", { method: "PATCH" });
    } catch {
      await load();
    } finally {
      refreshBell();
    }
  }

  // 알림 클릭 — 읽음 처리 후 연결된 경매로 이동. 읽음 API 실패는 이동을 막지 않는다(뱃지만 지연 반영).
  async function handleClick(notification: NotificationResponse) {
    if (!notification.isRead) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
      try {
        await fetchWithAuth<void>(`/api/members/me/notifications/${notification.id}/read`, { method: "PATCH" });
      } catch {
        // 무시 — 다음 조회에서 서버 상태로 보정된다.
      } finally {
        refreshBell();
      }
    }
    if (notification.type === "INQUIRY_ANSWERED") {
      router.push("/inquiries");
      return;
    }
    if (notification.auctionId != null) {
      router.push(`/auctions/${notification.auctionId}`);
    }
  }

  if (isLoading || !accessToken) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">알림을 불러오는 중...</div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">알림</h1>
          <p className="mt-1.5 text-sm text-text-3">입찰 추월·거래 소식을 모아봐요.</p>
        </div>
        {hasUnread && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className={`shrink-0 rounded-full border border-border-2 bg-white px-3.5 py-1.5 text-xs font-bold text-text-2 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
          >
            모두 읽음
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-r2 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-text-3">불러오는 중...</p>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-r3 border border-dashed border-border-2 py-20 text-center text-text-3">
          <BellIcon />
          <p className="text-sm font-bold text-text-2">아직 받은 알림이 없어요.</p>
          <p className="text-xs">입찰 추월·낙찰·유찰 소식을 여기서 받아볼 수 있어요.</p>
        </div>
      ) : (
        // 승인 시안 B — 카테고리 리딩 아이콘(의미색 톤) + 안읽음은 우측 단일 닷. 읽음 행은 배경·아이콘을 가라앉힌다.
        <ul className="overflow-hidden rounded-r3 border border-border">
          {notifications.map((notification) => {
            const meta = TYPE_META[notification.type] ?? UNKNOWN_META;
            const unread = !notification.isRead;
            return (
              <li key={notification.id} className="border-b border-border/60 last:border-b-0">
                <button
                  type="button"
                  onClick={() => handleClick(notification)}
                  className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-2/60 ${FOCUS_RING} ${
                    unread ? "bg-surface" : "bg-surface-2/40"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[20px] ${STATUS_TONE_CLASS[meta.tone]} ${unread ? "" : "opacity-70"}`}
                    aria-label={meta.label}
                  >
                    <StatusGlyph name={meta.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-bold text-text-1" : "text-text-2"}`}>
                        {notification.title}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-text-3">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </span>
                    <span className={`mt-0.5 block truncate text-[13px] leading-relaxed ${unread ? "text-text-2" : "text-text-3"}`}>
                      {notification.message}
                    </span>
                  </span>
                  {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={`rounded-full border border-border-2 bg-white px-5 py-2 text-sm font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-50 ${FOCUS_RING}`}
          >
            {loadingMore ? "불러오는 중..." : "더 보기"}
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-text-3">
        <Link href="/mypage" className={`font-bold text-text-3 hover:text-primary ${FOCUS_RING}`}>
          마이페이지로 돌아가기 →
        </Link>
      </p>
    </div>
  );
}
