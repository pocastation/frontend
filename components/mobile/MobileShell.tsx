"use client";

import { useEffect, type ReactNode } from "react";
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
 * <p>하단탭은 국내 커머스 앱 관례대로 **다섯 칸을 같은 무게로** 두고 떠 있는 FAB을 쓰지 않는다.
 * 아이콘은 면(fill)으로 그려 선택/비선택을 색으로만 가른다. 판매등록만 브랜드 보라를 쓴다 —
 * 화면에서 보라를 갖는 자리는 「핵심 액션 하나」뿐이라는 규칙(CLAUDE.md 「디자인」)을 따른 것이다.
 */
export type MobileTabKey = "홈" | "거래" | "판매등록" | "관심" | "마이";

// 하단탭 높이. 본문이 탭 뒤로 숨지 않도록 같은 높이의 스페이서를 깔고, 토스트도 이만큼 띄운다.
const TABBAR_HEIGHT = "calc(56px + env(safe-area-inset-bottom))";

// 아이콘은 인라인 SVG(면). 아이콘 폰트·외부 CDN은 쓰지 않는다.
// 판매등록만 path가 없다 — 유일하게 보라를 갖는 자리라 원형 플러스로 따로 그린다.
const TAB_ICON: Record<MobileTabKey, string | null> = {
  홈: "M12 3 3 10.2V21h6.2v-6.2h5.6V21H21V10.2z",
  거래: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  판매등록: null,
  관심: "M12 21s-8.5-5.4-8.5-11A4.8 4.8 0 0 1 12 6.6 4.8 4.8 0 0 1 20.5 10c0 5.6-8.5 11-8.5 11z",
  마이: "M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zM3.8 21a8.2 8.2 0 0 1 16.4 0z",
};

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

export default function MobileShell({ active, children }: { active: MobileTabKey; children: ReactNode }) {
  const { member } = useAuth();
  const { unreadCount } = useNotifications();

  // 토스트는 화면 하단 고정이라 그대로 두면 하단탭에 가린다. 탭바 높이를 CSS 변수로 넘겨
  // 토스트가 그만큼 올라오게 한다(ToastProvider가 `--mobile-tabbar-h`를 읽는다).
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--mobile-tabbar-h", TABBAR_HEIGHT);
    return () => {
      root.style.removeProperty("--mobile-tabbar-h");
    };
  }, []);

  // 비로그인 상태에서 개인 화면으로 보내면 빈 화면을 보게 된다 — 로그인으로 돌린다(헤더와 같은 규칙).
  const tabs: { key: MobileTabKey; href: string; label: string }[] = [
    { key: "홈", href: "/", label: "홈" },
    { key: "거래", href: "/auctions", label: "거래" },
    { key: "판매등록", href: member ? "/auctions/new" : "/login", label: "판매등록" },
    { key: "관심", href: member ? "/mypage?tab=wishlist" : "/login", label: "관심" },
    { key: "마이", href: member ? "/mypage" : "/login", label: "마이" },
  ];

  return (
    <>
      <header className="sticky top-0 z-[300] border-b border-border bg-white sm:hidden">
        <div className="flex h-12 items-center justify-between pl-[14px] pr-1">
          {/* 글자 높이는 19px이지만 탭 영역은 44px을 채운다(모바일 터치 타깃 최소치). */}
          <Link href="/" aria-label="포카스테이션 홈" className={`flex h-11 items-center rounded-r1 ${FOCUS_RING}`}>
            <Wordmark className="text-[19px] leading-none" />
          </Link>
          <div className="flex items-center">
            {/* 검색 전용 화면은 아직 없다 — 목록 화면의 검색으로 넘긴다(데스크탑 헤더 검색과 같은 도착지). */}
            <Link
              href="/auctions"
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

      {/* 본문이 하단탭 뒤로 숨지 않도록 같은 높이를 비워 둔다. */}
      <div aria-hidden="true" className="sm:hidden" style={{ height: TABBAR_HEIGHT }} />

      <nav
        aria-label="하단 메뉴"
        className="fixed inset-x-0 bottom-0 z-[300] flex border-t border-border bg-white sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((tab) => {
          const on = tab.key === active;
          const iconPath = TAB_ICON[tab.key];
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 pb-[7px] pt-2 transition-colors ${FOCUS_RING} ${
                on ? "text-text-1" : "text-text-3"
              }`}
            >
              {iconPath === null ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-primary" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M11 7h2v10h-2z" fill="#fff" />
                  <path d="M7 11h10v2H7z" fill="#fff" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={iconPath} />
                </svg>
              )}
              <span className={`text-[10.5px] ${on ? "font-extrabold" : "font-semibold"}`}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
