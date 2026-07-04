"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import AuctionCountdown from "@/components/AuctionCountdown";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse } from "@/lib/types";
import { formatKRW, isEndingSoon } from "@/lib/format";

const STATUS_BADGE: Record<string, { label: string; className: string; pulse?: boolean }> = {
  LIVE: { label: "진행 중", className: "bg-accent/90", pulse: true },
  ENDING: { label: "마감 임박", className: "bg-[#F59E0B]/90" },
  ENDED_SOLD: { label: "종료", className: "bg-text-2/85" },
  ENDED_NO_BIDS: { label: "유찰", className: "bg-text-2/85" },
  SCHEDULED: { label: "시작 예정", className: "bg-primary/85" },
};

export default function AuctionCard({ auction }: { auction: AuctionResponse }) {
  const isLive = auction.status === "LIVE";
  const badgeKey = isLive && isEndingSoon(auction.endAt) ? "ENDING" : auction.status;
  const badge = STATUS_BADGE[badgeKey] ?? { label: auction.status, className: "bg-text-2/85" };

  const [imageFailed, setImageFailed] = useState(false);
  const showImage = auction.representativeThumbnailUrl && !imageFailed;

  // 이미지가 하이드레이션이 끝나기 전에 이미 실패했으면 onError 이벤트를 못 받을 수 있다
  // (브라우저가 SSR HTML을 보고 먼저 로드를 시도하기 때문) — ref 콜백에서 img.complete를
  // 즉시 한 번 더 확인해 그 경합을 놓치지 않는다.
  function checkAlreadyFailed(img: HTMLImageElement | null) {
    if (img && img.complete && img.naturalWidth === 0) {
      setImageFailed(true);
    }
  }

  function handleImageError(e: SyntheticEvent<HTMLImageElement>) {
    checkAlreadyFailed(e.currentTarget);
  }

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className={`block overflow-hidden rounded-r4 border border-border bg-surface shadow-card transition-all hover:-translate-y-[3px] hover:border-primary hover:shadow-[0_8px_28px_rgba(17,17,24,0.1)] active:translate-y-0 ${FOCUS_RING}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-[#1e1065] to-[#4c1d95] text-5xl">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
          <img
            ref={checkAlreadyFailed}
            src={mediaUrl(auction.representativeThumbnailUrl!)}
            alt={auction.title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={handleImageError}
          />
        ) : null}
        <span
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 55%, rgba(17,17,24,0.4) 100%)" }}
          aria-hidden="true"
        />

        <span
          className={`absolute left-2 top-2 z-[2] flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-extrabold text-white backdrop-blur-sm ${badge.className}`}
        >
          {badge.pulse && <span className="h-1 w-1 animate-pulse rounded-full bg-white" aria-hidden="true" />}
          {badge.label}
        </span>

        {isLive && <AuctionCountdown endAt={auction.endAt} />}
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
            {formatKRW(auction.currentPrice)}
          </span>
          <span className="font-display text-[11px] text-text-3">{auction.bidCount}회 입찰</span>
        </div>
      </div>
    </Link>
  );
}
