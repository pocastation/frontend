"use client";

import { useEffect, useState } from "react";

function computeLabel(endAt: string): string | null {
  const diffMs = new Date(endAt).getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}일 ${hours}시간 남음`;
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  if (minutes > 0) return `${minutes}분 ${seconds}초 남음`;
  return `${seconds}초 남음`;
}

// 참고 디자인의 카드 배지(썸네일 좌하단, 반투명 블랙+블러 필)를 그대로 따르되, 원본은
// 일(day) 단위를 안 다뤄서 여러 날 남은 경매에 "70시간" 식으로 나오는 문제가 있어 그 부분만 보완.
export default function AuctionCountdown({ endAt }: { endAt: string }) {
  const [label, setLabel] = useState(() => computeLabel(endAt));

  useEffect(() => {
    const id = setInterval(() => setLabel(computeLabel(endAt)), 1000);
    return () => clearInterval(id);
  }, [endAt]);

  if (!label) return null;

  return (
    <span className="absolute bottom-2 left-2 z-[2] flex items-center gap-1 rounded-r1 bg-black/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
      <span aria-hidden="true">⏱</span>
      {label}
    </span>
  );
}
