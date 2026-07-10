"use client";

import { useState } from "react";
import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { formatKRW } from "@/lib/format";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import type { AuctionResponse } from "@/lib/types";
import WishlistHeart from "@/components/WishlistHeart";

// 캐러셀은 실제 진행 중인 경매(최대 3건, page.tsx가 이미 가져온 목록의 앞부분)만 순환한다 —
// 가짜 슬라이드를 지어내지 않는다. 경매가 하나뿐이거나 없으면 화살표 없이 카드 하나만 보인다.
export default function Hero({ liveCount, featured }: { liveCount: number; featured: AuctionResponse[] }) {
  const [index, setIndex] = useState(0);
  const current = featured[index] ?? null;
  const hasMultiple = featured.length > 1;
  const { wishlisted, toggle } = useWishlistStatus(featured.map((a) => a.id));

  function go(delta: number) {
    setIndex((i) => (i + delta + featured.length) % featured.length);
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 70% 90% at 15% 30%, #2a1a6e 0%, #17102f 55%), linear-gradient(120deg, #1a1235 0%, #241a4a 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 88% 60%, rgba(244,63,94,.22) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 30% 90%, rgba(91,63,232,.5) 0%, transparent 55%)",
        }}
        aria-hidden="true"
      />

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="이전 경매"
            className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="다음 경매"
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ›
          </button>
        </>
      )}

      <div className="relative mx-auto flex max-w-[1160px] flex-col items-center gap-10 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-16">
        <div className="max-w-[560px] text-center sm:text-left">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-white/85">
            <span className="flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
              LIVE
            </span>
            지금 <strong className="mx-0.5 text-white">{liveCount}개</strong> 경매 진행 중
          </div>

          <h1 className="font-display text-[clamp(26px,4.5vw,44px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
            <span className="font-sans font-black tracking-[-0.02em]">K-POP 포토카드</span>
            <br />
            우주에서 만나는
            <br />
            <span className="font-sans font-black tracking-[-0.02em]">경매 플랫폼</span>
          </h1>

          <p className="mt-3.5 text-sm leading-relaxed text-white/60">
            희귀 포카부터 한정판 굿즈까지 — 공정한 경매로 진짜 가치를 찾아드립니다.
          </p>

          <div className="mt-7 flex justify-center gap-7 sm:justify-start" aria-label="서비스 예시 지표">
            <div>
              <p className="font-display text-xl font-extrabold text-white">12만+</p>
              <p className="text-[11px] text-white/50">누적 거래</p>
            </div>
            <div>
              <p className="font-display text-xl font-extrabold text-white">4.9★</p>
              <p className="text-[11px] text-white/50">만족도</p>
            </div>
            <div>
              <p className="font-display text-xl font-extrabold text-white">98%</p>
              <p className="text-[11px] text-white/50">안전 거래</p>
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-white/35">* 예시 지표 — 정식 오픈 후 실제 데이터로 교체됩니다</p>

          <div className="mt-6 flex justify-center gap-2.5 sm:justify-start">
            <Link
              href="#auctions"
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-primary transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              진행 중인 경매 보기 →
            </Link>
            <Link
              href="/guide"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/30 px-6 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              이용 방법
            </Link>
          </div>
        </div>

        {current && (
          <Link
            href={`/auctions/${current.id}`}
            className="w-48 shrink-0 overflow-hidden rounded-r5 border border-white/20 bg-white/10 shadow-modal backdrop-blur-xl transition-transform hover:-translate-y-1.5 hover:rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <div className="relative flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-[#1e1065] to-[#4c1d95] text-5xl">
              {current.representativeThumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
                <img
                  src={mediaUrl(current.representativeThumbnailUrl)}
                  alt={current.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-white/45" aria-hidden="true">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                </span>
              )}
              <WishlistHeart
                auctionId={current.id}
                active={wishlisted.has(current.id)}
                onToggle={(next) => toggle(current.id, next)}
                className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:text-accent"
              />
            </div>
            <div className="border-t border-white/10 p-3.5">
              <p className="truncate text-sm font-bold text-white">{current.artistName ?? current.title}</p>
              <p className="mt-0.5 truncate text-xs text-white/50">{current.title}</p>
              <p className="mt-2 flex items-center justify-between font-display text-base font-bold text-white">
                {formatKRW(current.currentPrice)}
                <span className="flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                  LIVE
                </span>
              </p>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
