"use client";

import { useState } from "react";

// 위시리스트 도메인은 아직 없다 — 클릭하면 로컬 상태만 토글되고 새로고침하면 초기화된다.
// 리디자인 검토에서 "UI는 미리 반영, 저장은 나중에"로 정리된 자리라 API 호출은 없다.
export default function WishlistHeart({
  className = "",
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "관심 경매에서 제외" : "관심 경매로 등록"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setActive((v) => !v);
      }}
      className={className}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        className={active ? "text-accent" : undefined}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
      </svg>
    </button>
  );
}
