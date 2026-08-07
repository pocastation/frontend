"use client";

import { useEffect, useState } from "react";

// 마감까지 1시간 이내면 칩이 accent로 바뀐다. 문구는 그대로 두고 **색 하나로만** 급함을 말한다 —
// "마감 임박" 같은 라벨을 따로 띄우면 시계와 같은 말을 두 번 하게 된다.
const URGENT_MS = 60 * 60 * 1000;

// 목록에서는 **초를 그리지 않는다**(#277). 격자에 수십 장이 깔릴 때 초 단위로 흔들리는 숫자가
// 사진보다 먼저 눈에 들어왔다. 정확한 초는 상세 페이지가 계속 보여준다 — 안티 스나이핑(마감 3분
// 내 입찰 시 연장)이 걸리는 곳은 상세이지 목록이 아니다.
function computeLabel(diffMs: number): string {
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분`;
  // 1분 미만. 초를 안 쓰기로 했으므로 남은 시간을 숫자 대신 말로 알린다.
  return "곧 마감";
}

export default function AuctionCountdown({ endAt }: { endAt: string }) {
  // 서버 시각으로 SSR한 값은 클라이언트 하이드레이션 시점과 어긋나 미스매치를 일으킨다 —
  // 초기값을 null로 두어 서버·클라 첫 렌더를 "칩 없음"으로 일치시키고, 마운트 직후 effect에서
  // 실제 남은시간을 계산해 표시한다.
  const [state, setState] = useState<{ label: string; urgent: boolean } | null>(null);

  useEffect(() => {
    const update = () => {
      const diffMs = new Date(endAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setState(null);
        return;
      }
      setState({ label: computeLabel(diffMs), urgent: diffMs <= URGENT_MS });
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

  // 잉크 칩 — 사진 위에 얹혀도 지면을 빼앗지 않는다. 어두운 사진에서는 칩 경계가 녹고 흰 글자만
  // 남아 포카가 먼저 보인다. 색이 올라오는 건 마감 임박 하나뿐이다.
  return (
    <span
      className={`absolute left-1.5 top-1.5 z-[2] rounded-[4px] px-1.5 py-0.5 text-[9.5px] font-extrabold leading-[1.35] tabular-nums tracking-[-0.01em] text-white ${
        state.urgent ? "bg-accent" : "bg-text-1/80"
      }`}
    >
      {state.label}
    </span>
  );
}
