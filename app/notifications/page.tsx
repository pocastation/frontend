"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notification-context";
import { formatRelativeTime } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type { NotificationListResponse, NotificationResponse, NotificationType } from "@/lib/types";

// 타입별 배지 라벨/색. 낙찰=긍정(ok), 유찰=중립(회색), 추월=주의(primary).
const TYPE_BADGE: Record<NotificationType, { label: string; className: string }> = {
  OUTBID: { label: "입찰 추월", className: "bg-primary-soft text-primary" },
  AUCTION_WON: { label: "낙찰", className: "bg-ok-soft text-ok" },
  AUCTION_LOST: { label: "패찰", className: "bg-accent-soft text-accent" },
  AUCTION_ENDED_NO_BIDS: { label: "유찰", className: "bg-surface-3 text-text-2" },
};

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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchWithAuth<NotificationListResponse>("/api/members/me/notifications?size=50");
      setNotifications(res.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "알림을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

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
        <ul className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => handleClick(notification)}
                className={`flex w-full items-start gap-3 rounded-r3 border p-4 text-left transition-colors ${FOCUS_RING} ${
                  notification.isRead
                    ? "border-border bg-surface hover:border-border-2"
                    : "border-primary/30 bg-primary-soft/40 hover:border-primary"
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-transparent" : "bg-accent"}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TYPE_BADGE[notification.type].className}`}>
                      {TYPE_BADGE[notification.type].label}
                    </span>
                    <span className="text-[11px] text-text-3">{formatRelativeTime(notification.createdAt)}</span>
                  </span>
                  <span className="mt-1.5 block truncate text-sm font-bold text-text-1">{notification.title}</span>
                  <span className="mt-0.5 block text-sm text-text-2">{notification.message}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-xs text-text-3">
        <Link href="/mypage" className={`font-bold text-text-3 hover:text-primary ${FOCUS_RING}`}>
          마이페이지로 돌아가기 →
        </Link>
      </p>
    </div>
  );
}
