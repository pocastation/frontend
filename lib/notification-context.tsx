"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./auth-context";

// 헤더 벨 뱃지(미읽음 개수)를 전역에서 하나로 공유한다 — 알림함 페이지에서 읽음 처리하면
// 벨도 즉시 반영돼야 하므로(WishlistProvider와 같은 이유). SSE 실시간 push는 후속 단계로 두고,
// 1단계는 가벼운 폴링(포커스 복귀 + 주기적)으로 충분히 "살아있는" 벨을 만든다.
type NotificationContextValue = {
  unreadCount: number;
  refresh: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const POLL_INTERVAL_MS = 60_000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { accessToken, fetchWithAuth } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    if (!accessToken) {
      setUnreadCount(0);
      return;
    }
    (async () => {
      try {
        const res = await fetchWithAuth<{ count: number }>("/api/members/me/notifications/unread-count");
        setUnreadCount(res.count);
      } catch {
        // 조회 실패는 뱃지에 치명적이지 않다 — 다음 폴링/포커스에서 다시 시도한다.
      }
    })();
  }, [accessToken, fetchWithAuth]);

  // 로그인 상태가 바뀌면 즉시 재조회(로그아웃 시 0으로, 로그인 시 실제 개수로).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 인증 상태 변화에 맞춰 미읽음수를 동기화한다.
    refresh();
  }, [accessToken, refresh]);

  // 주기적 폴링 + 탭 포커스 복귀 시 재조회 — 비로그인일 땐 refresh가 알아서 0으로 끝난다.
  useEffect(() => {
    if (!accessToken) return;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [accessToken, refresh]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
