"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 모바일 하단 5탭 — 전역(#554).
 *
 * <p>예전에는 {@link MobileShell}이 탭바를 함께 그렸다. 셸을 쓰는 화면은 넷뿐이라, 매물 상세나
 * 알림처럼 셸을 안 쓰는 화면에서는 탭이 통째로 사라졌다. 앱에서 하단 탭이 사라지는 것은
 * 「지금은 다른 맥락」이라는 뜻인데, 목록에서 상세로 들어간 것뿐인데도 그렇게 읽혔다.
 *
 * <p>그래서 탭바는 루트 레이아웃이 한 번 그리고, <b>사라져야 하는 화면만 골라 숨긴다</b>.
 * 숨기는 기준은 「돌아갈 곳이 아니라 끝내야 할 일이 있는 화면」이다 — 위저드·결제·인증.
 *
 * <p>하단 고정 액션 바가 있는 화면에서는 액션 바가 탭바 <b>위에</b> 쌓인다. 액션 바가
 * {@code --mobile-tabbar-h}를 bottom으로 읽어 스스로 올라온다.
 */

/*
  하단탭 높이. 본문 스페이서·토스트·액션 바가 모두 이 값을 기준으로 자리를 잡는다.

  nav에 이 높이를 직접 박는다 — 선언값과 실제 높이가 어긋나면 위에 쌓이는 액션 바가 그만큼
  겹친다. 내용(아이콘 24 + 라벨)이 자라도록 두면 60px이 나오므로 그 값을 기준으로 삼는다.
*/
const TABBAR_HEIGHT = "calc(60px + env(safe-area-inset-bottom))";

export type MobileTabKey = "홈" | "거래" | "판매등록" | "관심" | "마이";

/*
  탭을 숨기는 화면.

  판매등록 위저드·결제는 중간에 나가면 안 되는 절차라 나가는 길을 좁힌다(앱바의 뒤로/닫기만
  남는다). 등록완료는 종착 화면이고 자체 닫기를 갖는다. 로그인·가입·비밀번호 재설정·온보딩은
  계정이 없는 상태라 탭 다섯 중 셋이 다시 로그인으로 돌아오는 자리가 된다.

  사진 확대 뷰어는 라우트가 아니라 전체 화면 오버레이(z-400)라 여기 없다 — 탭바(z-300) 위를
  통째로 덮는다.
*/
const HIDDEN_EXACT = new Set(["/auctions/new", "/auctions/submitted", "/login", "/signup", "/onboarding"]);
const HIDDEN_PREFIX = ["/auth/", "/admin"];

function isHidden(pathname: string): boolean {
  if (HIDDEN_EXACT.has(pathname)) return true;
  if (HIDDEN_PREFIX.some((prefix) => pathname.startsWith(prefix))) return true;
  // 결제는 /orders/{id}/payment — id가 끼어 있어 접두사로는 못 고른다.
  return /^\/orders\/[^/]+\/payment$/.test(pathname);
}

/** 지금 화면이 다섯 탭 중 어디에 속하는지. 어디에도 안 속하면 아무것도 켜지 않는다. */
function activeTab(pathname: string, wishlist: boolean): MobileTabKey | null {
  if (pathname === "/") return "홈";
  if (pathname === "/mypage") return wishlist ? "관심" : "마이";
  if (
    pathname.startsWith("/auctions") ||
    pathname.startsWith("/instant-sales") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/artists") ||
    pathname.startsWith("/sellers")
  ) {
    return "거래";
  }
  return null;
}

// 아이콘은 인라인 SVG(면). 아이콘 폰트·외부 CDN은 쓰지 않는다.
// 판매등록만 path가 없다 — 유일하게 보라를 갖는 자리라 원형 플러스로 따로 그린다.
const TAB_ICON: Record<MobileTabKey, string | null> = {
  홈: "M12 3 3 10.2V21h6.2v-6.2h5.6V21H21V10.2z",
  거래: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  판매등록: null,
  관심: "M12 21s-8.5-5.4-8.5-11A4.8 4.8 0 0 1 12 6.6 4.8 4.8 0 0 1 20.5 10c0 5.6-8.5 11-8.5 11z",
  마이: "M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zM3.8 21a8.2 8.2 0 0 1 16.4 0z",
};

export default function MobileTabBar() {
  const { member } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hidden = isHidden(pathname);

  /*
    탭바 높이를 CSS 변수로 알린다. 토스트(ToastProvider)와 하단 액션 바가 이 값만큼 올라온다.
    숨긴 화면에서는 변수를 지워, 읽는 쪽이 자기 기본값(safe-area)으로 돌아가게 한다.
  */
  useEffect(() => {
    const root = document.documentElement;
    if (hidden) {
      root.style.removeProperty("--mobile-tabbar-h");
      return;
    }
    root.style.setProperty("--mobile-tabbar-h", TABBAR_HEIGHT);
    return () => {
      root.style.removeProperty("--mobile-tabbar-h");
    };
  }, [hidden]);

  if (hidden) return null;

  const active = activeTab(pathname, searchParams.get("tab") === "wishlist");

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
      {/* 푸터 끝이 탭 뒤로 숨지 않도록 같은 높이를 비워 둔다. 흐름 맨 끝(푸터 다음)에 놓인다. */}
      <div aria-hidden="true" className="sm:hidden" style={{ height: TABBAR_HEIGHT }} />

      <nav
        aria-label="하단 메뉴"
        className="fixed inset-x-0 bottom-0 z-[300] flex border-t border-border bg-white sm:hidden"
        style={{ height: TABBAR_HEIGHT, paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((tab) => {
          const on = tab.key === active;
          const iconPath = TAB_ICON[tab.key];
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 pb-[7px] pt-2 transition-colors ${FOCUS_RING} ${
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
