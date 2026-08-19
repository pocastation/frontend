"use client";

import { useEffect, useState } from "react";
import { countdownLevel, formatRemaining, type CountdownLevel } from "@/lib/countdown";

// 칩 지면은 항상 잉크(검정)이고 **글자 색만** 급함을 말한다. 12시간 이내부터 "마감임박"이 붙는다.
//
// 색은 흰 지면용 토큰을 그대로 쓰지 않는다 — 잉크 칩 위에서 `danger`(#DC2626)는 대비 3.9:1로
// 기준(4.5:1)에 미달하고 `warn`(#D97706)도 5.9:1로 아슬아슬하다. 다크 지면용 밝은 단계를 쓴다
// (디자인 시스템이 딥스페이스 지면에 규정한 값과 같은 계열, 모바일 홈 배너와도 일치).
const LEVEL_TEXT: Record<CountdownLevel, string> = {
  normal: "#ffffff",
  soon: "#fba94c", // 9.7:1
  critical: "#ff8a8a", // 8.3:1
  ended: "#ffffff",
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

  // 잉크 칩 — 사진 위에 얹혀도 지면을 빼앗지 않는다. 어두운 사진에서는 칩 경계가 녹고 글자만
  // 남아 포카가 먼저 보인다. 배경은 늘 잉크이고, 변하는 건 글자 색과 "마감임박" 유무뿐이다.
  const urgent = state.level === "soon" || state.level === "critical";
  return (
    <span
      className="absolute left-1.5 top-1.5 z-[2] rounded-[4px] bg-text-1/80 px-1.5 py-0.5 text-[9.5px] font-extrabold leading-[1.35] tabular-nums tracking-[-0.01em]"
      style={{ color: LEVEL_TEXT[state.level] }}
    >
      {urgent ? `마감임박 ${state.label}` : state.label}
    </span>
  );
}
