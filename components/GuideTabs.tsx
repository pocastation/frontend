"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { FOCUS_RING } from "@/lib/ui";

export type GuideTab = { id: string; label: string; panel: ReactNode };

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * WAI-ARIA 탭 패턴 — 클릭 + 방향키(←/→/Home/End), 이동 즉시 활성화.
 *
 * 해시 딥링크를 지원한다(`/guide#seller`) — 판매 등록 가이드에서 "전체 가이드로" 돌아올 때
 * 판매자 탭이 바로 열려야 하고, 링크를 공유할 수 있어야 한다.
 *
 * 해시 갱신은 `history.replaceState`로 한다 — 자세한 이유는 select() 주석 참고.
 */
export default function GuideTabs({ tabs, ariaLabel }: { tabs: GuideTab[]; ariaLabel: string }) {
  // 해시를 effect 안에서 읽어 setState 하면 하이드레이션 직후 한 프레임이 어긋나고,
  // 린트(react-hooks/set-state-in-effect)에도 걸린다. 외부 저장소로 구독하면 React가
  // 서버 스냅샷(빈 문자열)과 클라이언트 값을 알아서 이어준다.
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash.replace("#", ""),
    () => "",
  );
  // 사용자가 탭을 고르면 그 선택이 해시보다 우선한다(고른 탭이 해시 변화에 밀리지 않게).
  const [picked, setPicked] = useState<number | null>(null);
  const fromHash = tabs.findIndex((t) => t.id === hash);
  const active = picked ?? (fromHash >= 0 ? fromHash : 0);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(index: number) {
    setPicked(index);
    // location.hash에 대입하면 브라우저가 그 요소로 스크롤을 점프시켜 화면이 튄다.
    // 공유 가능한 URL만 유지하면 되므로 히스토리만 갈아끼운다.
    window.history.replaceState(null, "", `#${tabs[index].id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    tabRefs.current[next]?.focus();
    select(next);
  }

  return (
    <>
      {/* 밑줄 탭 — 알약 버튼 세 개를 가운데 늘어놓으면 문서가 아니라 랜딩 위젯처럼 보인다.
          활성 표시는 브랜드 보라다. 보라를 배경·아이콘·제목에서 걷어낸 대신,
          '지금 어느 흐름을 보고 있는가'처럼 상태를 말하는 자리에는 확실하게 쓴다.
          밑줄만으로는 약해서 글자색·굵기·크기까지 함께 올린다. */}
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="-mx-5 flex gap-7 overflow-x-auto border-b border-border-2 px-5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === i}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3.5 transition-colors ${FOCUS_RING} ${
              active === i
                ? "border-current text-[15px] font-extrabold tracking-[-0.02em] text-primary"
                : "border-transparent text-[14px] font-bold text-text-3 hover:text-text-1"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== i}
        >
          {tab.panel}
        </div>
      ))}
    </>
  );
}
