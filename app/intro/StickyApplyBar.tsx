"use client";

import { useEffect, useState } from "react";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 모바일 하단 고정 CTA.
 *
 * 폼이 화면에 보이는 동안에는 뜨지 않는다 — 폼 바로 위에 "폼으로 가기" 버튼이 떠 있으면
 * 화면만 가린다. 폼이 든 히어로가 뷰포트를 벗어났을 때만 노출한다.
 *
 * <b>관찰 대상이 폼(`#apply`)이 아니라 히어로(`#intro-hero`)인 이유.</b> 폼은 `useSearchParams`를
 * 쓰는 클라이언트 컴포넌트라 `<Suspense>`에 싸여 있다 — 이 effect가 도는 시점에 아직 fallback이
 * 걸려 있으면 `getElementById('apply')`가 null이라 관찰이 **시작조차 되지 않고**, 이후 폼이
 * 떠도 바는 영영 안 나타난다. 실제로 그렇게 동작했다. 히어로는 서버에서 렌더되는 순수 마크업이라
 * 항상 있고, 폼을 품고 있어서 "폼이 화면 밖"과 같은 뜻이 된다.
 *
 * 데스크톱에서는 아예 렌더하지 않는다(`sm:hidden`). 넓은 화면은 폼이 첫 화면에 같이 보여서
 * 하단 바가 할 일이 없다.
 */
export default function StickyApplyBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("intro-hero");
    if (!hero) return;

    const io = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      // 조금이라도 보이면 숨긴다. threshold를 높이면 히어로 하단이 걸쳐 있을 때
      // 바가 떠서 입력칸을 가린다.
      { threshold: 0 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  function scrollToForm() {
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className={`fixed inset-x-0 z-50 border-t border-border bg-white px-4 py-3 transition-transform sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      // 하단 5탭 위에 쌓인다(#554).
      style={{ bottom: "var(--mobile-tabbar-h, 0px)" }}
      // 화면 밖으로 내려가 있을 때는 보조기기·키보드 탐색에서도 빠져야 한다.
      aria-hidden={!visible}
    >
      <button
        type="button"
        onClick={scrollToForm}
        tabIndex={visible ? 0 : -1}
        className={`flex h-12 w-full items-center justify-center rounded-[4px] bg-primary text-[15px] font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
      >
        사전 신청하고 혜택 받기
      </button>
    </div>
  );
}
