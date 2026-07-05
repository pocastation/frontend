"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// 실제 관심목록 API(POST/DELETE /api/auctions/{id}/wishlist)와 연동된 하트 — active/onToggle은
// 부모(그리드를 소유한 컴포넌트)가 useWishlistStatus로 배치 조회한 상태를 그대로 내려준다.
// 카드마다 이 컴포넌트가 각자 서버에 상태를 물어보면 카드 수만큼 요청이 나가므로 일부러
// controlled로 만들었다.
export default function WishlistHeart({
  auctionId,
  active,
  onToggle,
  className = "",
  size = 16,
}: {
  auctionId: number;
  active: boolean;
  onToggle: (next: boolean) => void;
  className?: string;
  size?: number;
}) {
  const { accessToken, fetchWithAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!accessToken) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pending) return;

    const next = !active;
    setPending(true);
    onToggle(next); // 낙관적 갱신 — 실패하면 아래에서 되돌린다.
    try {
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/wishlist`, {
        method: next ? "POST" : "DELETE",
      });
    } catch {
      onToggle(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "관심 경매에서 제외" : "관심 경매로 등록"}
      onClick={handleClick}
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
