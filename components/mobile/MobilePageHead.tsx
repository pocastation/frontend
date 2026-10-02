"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FOCUS_RING, PRESS_ICON } from "@/lib/ui";
import { dismiss, markNav } from "@/lib/nav-transition";

/**
 * 모바일 서브 화면 앱바 — 뒤로 44px + 제목 17px + 우측 액션 슬롯.
 *
 * <p>모바일 헤더는 두 종류뿐이다. ① 루트 탭(홈·거래·관심·마이)은 {@link MobileShell}의 워드마크
 * 바 + 하단탭, ② 그 아래 모든 화면은 이 앱바 하나로 통일하고 하단탭·푸터는 접는다.
 * **화면 안에서 제목을 h1으로 다시 반복하지 않는다** — 당근·번개장터·토스가 쓰는 문법이다.
 *
 * <p>이번 이슈(#341)에서는 컴포넌트만 두고 적용하지 않는다. 서브 화면을 모바일로 옮기는
 * 후속 이슈에서 각 페이지가 이걸 쓴다.
 */
export default function MobilePageHead({
  title,
  sub,
  action,
  backHref,
  variant = "back",
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  /** 지정하면 그 경로로 이동한다. 없으면 브라우저 히스토리 뒤로(진입 경로를 그대로 되짚는다). */
  backHref?: string;
  /**
   * `"close"`는 뒤로 대신 **닫기(X)를 오른쪽에** 둔다 — 되돌아갈 데가 없는 종착 화면용(#515).
   * 등록완료가 그렇다: 폼은 이미 제출됐고 뒤로 가면 방금 보낸 위저드로 돌아간다.
   * 이때 `backHref`는 뒤로가 아니라 **닫고 갈 곳**이다(없으면 히스토리 뒤로).
   *
   * `"dismiss"`는 같은 닫기(X)지만 위저드용이다. 앱 안에서 들어왔으면 들어온 길로 되돌아가고(히스토리 뒤로),
   * 주소로 바로 들어왔으면 `backHref`로 갈아 끼운다. 정해진 경로로 push하면 거기서 뒤로를 눌렀을 때 방금
   * 닫은 위저드가 다시 열린다.
   */
  variant?: "back" | "close" | "dismiss";
}) {
  const router = useRouter();
  // 뒤로(variant="back")로 정해진 경로에 갈 때만 화면을 뒤로 민다. 히스토리 뒤로는 NavTransition이
  // popstate에서 표시하고, 닫기(X)는 들어온 길을 되짚는 이동이 아니라 밀지 않는다.
  const leave = () => {
    if (variant === "dismiss") return backHref ? dismiss(router, backHref) : router.back();
    if (!backHref) return router.back();
    if (variant === "back") markNav("back");
    router.push(backHref);
  };

  return (
    <header className="sticky top-0 z-[300] border-b border-border bg-white sm:hidden">
      <div className={`flex min-h-12 items-center gap-1 pr-gutter ${variant === "back" ? "pl-1" : "pl-gutter"}`}>
        {variant === "back" && (
          <button
            type="button"
            aria-label="뒤로"
            onClick={leave}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-text-1 hover:bg-surface-2 ${PRESS_ICON} ${FOCUS_RING}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-title-s font-extrabold text-text-1">{title}</h1>
          {sub && <p className="truncate text-label text-text-3">{sub}</p>}
        </div>
        {action && <div className="flex flex-shrink-0 items-center">{action}</div>}
        {variant !== "back" && (
          <button
            type="button"
            aria-label="닫기"
            onClick={leave}
            className={`-mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-text-2 hover:bg-surface-2 ${PRESS_ICON} ${FOCUS_RING}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
