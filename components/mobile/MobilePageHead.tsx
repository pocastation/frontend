"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FOCUS_RING } from "@/lib/ui";

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
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  /** 지정하면 그 경로로 이동한다. 없으면 브라우저 히스토리 뒤로(진입 경로를 그대로 되짚는다). */
  backHref?: string;
}) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-[300] border-b border-border bg-white sm:hidden">
      <div className="flex min-h-12 items-center gap-1 pl-1 pr-[14px]">
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-text-1 transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-extrabold tracking-tight text-text-1">{title}</h1>
          {sub && <p className="truncate text-[11.5px] text-text-3">{sub}</p>}
        </div>
        {action && <div className="flex flex-shrink-0 items-center">{action}</div>}
      </div>
    </header>
  );
}
