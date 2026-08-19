"use client";

import { useEffect, useState } from "react";
import { countdownLevel, formatRemaining, type CountdownLevel } from "@/lib/countdown";

// 칩 지면은 흰색이고 **글자 색만** 급함을 말한다. 12시간 이내부터 "마감임박"이 붙는다.
//
// ⚠️ 이 두 색은 흰 칩 위에서 각각 3.6:1 · 3.8:1로 **WCAG AA(4.5:1)에 미달한다.** 더 밝게 해달라는
// 요청을 따른 값이다 — 밝기와 대비는 흰 지면에서 정면으로 맞바꾸는 관계라, 기준을 지키려면
// #C2410C(5.2:1)·#DC2626(4.8:1)까지 어두워져야 한다. 급함은 색 말고 "마감임박"이라는 글자로도
// 말하고 있어 색만으로 정보를 전달하지는 않는다.
const LEVEL_TEXT: Record<CountdownLevel, string> = {
  normal: "#111118", // 잉크 18.8:1
  soon: "#ea580c", // 3.6:1
  critical: "#ef4444", // 3.8:1
  ended: "#111118",
};

export default function AuctionCountdown({ endAt }: { endAt: string }) {
  // 서버 시각으로 SSR한 값은 클라이언트 하이드레이션 시점과 어긋나 미스매치를 일으킨다 —
  // 초기값을 null로 두어 서버·클라 첫 렌더를 "칩 없음"으로 일치시키고, 마운트 직후 effect에서
  // 실제 남은시간을 계산해 표시한다.
  const [state, setState] = useState<{ label: string; level: CountdownLevel } | null>(null);

  useEffect(() => {
    const update = () => {
      const diffMs = new Date(endAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setState(null);
        return;
      }
      setState({ label: formatRemaining(diffMs), level: countdownLevel(diffMs) });
    };
    const raf = requestAnimationFrame(update);
    // 분까지만 그리므로 1초마다 재계산할 이유가 없다. 격자에 수십 장이 깔리면 그 차이가 커진다.
    const id = setInterval(update, 15000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [endAt]);

  if (!state) return null;

  // 흰 칩 — 배경은 늘 흰색이고, 변하는 건 글자 색과 "마감임박" 유무뿐이다(킷의 칩과 같은 지면).
  const urgent = state.level === "soon" || state.level === "critical";
  return (
    <span
      className="absolute left-1.5 top-1.5 z-[2] rounded-[4px] bg-white/95 px-1.5 py-0.5 text-[9.5px] font-extrabold leading-[1.35] tabular-nums tracking-[-0.01em]"
      style={{ color: LEVEL_TEXT[state.level] }}
    >
      {urgent ? `마감임박 ${state.label}` : state.label}
    </span>
  );
}
