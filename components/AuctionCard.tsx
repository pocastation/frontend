"use client";

import { useState } from "react";
import Link from "next/link";
import AuctionCountdown from "@/components/AuctionCountdown";
import WishlistHeart from "@/components/WishlistHeart";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse } from "@/lib/types";
import { formatKRW, isEndingSoon } from "@/lib/format";

// v0 리톤 — 색 필 배지 대신 화이트 pill + 도트 인디케이터. 도트/텍스트만 상태색을 갖는다.
const STATUS_BADGE: Record<string, { label: string; dot: string; text?: string; pulse?: boolean }> = {
  LIVE: { label: "진행 중", dot: "bg-primary", pulse: true },
  ENDING: { label: "마감 임박", dot: "bg-warn", text: "text-warn" },
  ENDED_SOLD: { label: "종료", dot: "bg-text-3", text: "text-text-3" },
  ENDED_NO_BIDS: { label: "유찰", dot: "bg-text-3", text: "text-text-3" },
  SCHEDULED: { label: "시작 예정", dot: "bg-primary" },
};

export default function AuctionCard({
  auction,
  wishlisted,
  onToggleWishlist,
}: {
  auction: AuctionResponse;
  wishlisted: boolean;
  onToggleWishlist: (next: boolean) => void;
}) {
  const isLive = auction.status === "LIVE";
  const isInstantSale = auction.saleType === "INSTANT";
  const badgeKey = isLive && !isInstantSale && isEndingSoon(auction.endAt) ? "ENDING" : auction.status;
  const badge: { label: string; dot: string; text?: string; pulse?: boolean } = isInstantSale && isLive
    ? { label: "즉시판매", dot: "bg-primary" }
    : STATUS_BADGE[badgeKey] ?? { label: auction.status, dot: "bg-text-3", text: "text-text-3" };
  const displayPrice = isInstantSale ? (auction.buyNowPrice ?? auction.currentPrice) : auction.currentPrice;

  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const showImage = Boolean(auction.representativeThumbnailUrl) && !imageFailed;

  // 이미지가 하이드레이션 전에 이미 로드/실패를 끝냈으면 onLoad·onError 이벤트를 놓칠 수 있다
  // (브라우저가 SSR HTML을 보고 먼저 로드를 시도) — ref 콜백에서 img.complete를 즉시 확인해
  // 로드 완료/실패 여부를 그 경합에서도 반영한다.
  function syncImageState(img: HTMLImageElement | null) {
    if (!img || !img.complete) return;
    if (img.naturalWidth === 0) setImageFailed(true);
    else setImageLoaded(true);
  }

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className={`block overflow-hidden rounded-r4 border border-border bg-surface shadow-card transition-all hover:-translate-y-[3px] hover:border-primary hover:shadow-[0_8px_28px_rgba(17,17,24,0.1)] active:translate-y-0 ${FOCUS_RING}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-[#f4f4f5] to-[#e7e7ea]">
        {showImage ? (
          <>
            {/* 로딩 중에는 shimmer가 이미지 뒤에서 비친다. 이미지는 항상 불투명하게 두어
             * (SSR 하이드레이션 레이스로 onLoad를 놓쳐도) 절대 투명하게 갇히지 않는다 —
             * 로드되면 불투명한 이미지가 shimmer를 자연히 덮는다. imageLoaded는 로딩이
             * 확인되면 shimmer를 걷어 애니메이션을 멈추는 용도(정확성이 아니라 정리용). */}
            {!imageLoaded && <span className="sk-shimmer absolute inset-0" aria-hidden="true" />}
            {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
            <img
              ref={syncImageState}
              src={mediaUrl(auction.representativeThumbnailUrl!)}
              alt={auction.title}
              className="absolute inset-0 h-full w-full object-cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
            />
          </>
        ) : null}
        {/* URL이 없거나 로드 실패 시 중앙 폴백 아이콘 */}
        {!showImage && (
          <span className="absolute inset-0 flex items-center justify-center text-text-3/70" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </span>
        )}
        <span
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 55%, rgba(17,17,24,0.4) 100%)" }}
          aria-hidden="true"
        />

        <span
          className={`absolute left-2 top-2 z-[2] flex items-center gap-1.5 rounded-full border border-border bg-white/90 px-2 py-1 text-[10.5px] font-extrabold backdrop-blur-sm ${badge.text ?? "text-text-2"}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot} ${badge.pulse ? "animate-pulse" : ""}`} aria-hidden="true" />
          {badge.label}
        </span>

        {isLive && !isInstantSale && auction.endAt && <AuctionCountdown endAt={auction.endAt} />}

        <WishlistHeart
          auctionId={auction.id}
          active={wishlisted}
          onToggle={onToggleWishlist}
          className={`absolute right-2 top-2 z-[2] flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-text-2 backdrop-blur-sm transition-colors hover:text-accent ${FOCUS_RING}`}
        />
      </div>

      <div className="px-3.5 py-3">
        {auction.artistName && (
          <p className="truncate text-[10.5px] font-extrabold tracking-wide text-primary">
            {auction.artistName}
          </p>
        )}
        <h3 className="mt-0.5 truncate text-sm font-bold leading-tight text-text-1">{auction.title}</h3>

        <div className="my-2.5 h-px bg-border" />

        <div className="flex items-baseline justify-between">
          <span className="font-display text-base font-bold tracking-tight text-text-1">
            {formatKRW(displayPrice)}
          </span>
          <span className="font-display text-[11px] text-text-3">
            {isInstantSale
              ? "즉시구매"
              : auction.status === "ENDED_NO_BIDS"
                ? "입찰 없음"
                : `${auction.bidCount}회 입찰`}
          </span>
        </div>
      </div>
    </Link>
  );
}
