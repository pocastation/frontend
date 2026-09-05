"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notification-context";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 모바일 앱 셸 — 상단바 48px + 하단 5탭. 푸터는 전역(다크 4열)을 그대로 쓴다.
 *
 * <p>**크롬(chrome)만 담당하고 본문은 그대로 통과시킨다.** 셸 자체는 데스크탑에서 전부
 * `sm:hidden`으로 접히므로, 한 페이지를 모바일로 옮길 때 그 페이지를 이 컴포넌트로 감싸고
 * {@link MOBILE_SHELL_ROUTES}에 경로만 추가하면 된다 — 데스크탑 트리는 건드리지 않는다.
 *
 * <p>하단 5탭은 여기 없다 — 루트 레이아웃이 전역으로 그린다({@link MobileTabBar}, #554).
 */

function SearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function MobileShell({ children }: { children: ReactNode }) {
  const { member } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <>
      <header className="sticky top-0 z-[300] border-b border-border bg-white sm:hidden">
        <div className="flex h-12 items-center justify-between pl-[14px] pr-1">
          {/* 글자 높이는 19px이지만 탭 영역은 44px을 채운다(모바일 터치 타깃 최소치). */}
          <Link href="/" aria-label="포카스테이션 홈" className={`flex h-11 items-center rounded-r1 ${FOCUS_RING}`}>
            <Wordmark className="text-[19px] leading-none" />
          </Link>
          <div className="flex items-center">
            {/* 검색 전용 화면(#493). 도착하면 입력에 포커스가 잡혀 바로 칠 수 있다 —
                예전에는 /auctions로 보내 검색창을 한 번 더 눌러야 했다. */}
            <Link
              href="/search"
              aria-label="검색"
              className={`flex h-11 w-11 items-center justify-center rounded-full text-text-1 transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
            >
              <SearchIcon />
            </Link>
            <Link
              href="/notifications"
              aria-label={member && unreadCount > 0 ? `알림 ${unreadCount}개` : "알림"}
              className={`relative flex h-11 w-11 items-center justify-center rounded-full text-text-1 transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
            >
              <BellIcon />
              {member && unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-display text-[10px] font-extrabold leading-none tabular-nums text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {children}
    </>
  );
}
