"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { countdownLevel, countdownLevelAt, formatRemaining, type CountdownLevel } from "@/lib/countdown";
import { formatKRW } from "@/lib/format";
import { BRAND_HEADLINE_LINES, BRAND_SUBHEAD } from "@/lib/site";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse } from "@/lib/types";

/**
 * 모바일 홈 메인 배너 — 딥스페이스 지면 위 플랫 캐러셀.
 *
 * <p>**1장은 브랜드 확정 카피 고정**, 2장부터 관리자가 지정(featured)한 홍보 매물이다. 지정이
 * 없으면 브랜드 한 장만 남고 도트도 뜨지 않는다 — 없는 매물을 채워 넣지 않는다.
 *
 * <p>딥스페이스(#160C2E)와 별빛 골드는 **브랜드 면 전용**이라 이 배너 밖으로 나가지 않는다.
 * 다크 지면 위 텍스트는 색을 직접 지정한다 — invert로 밝히면 마감 임박 주황이 민트로 뒤집힌다.
 */

const AUTO_MS = 5000;
const SWIPE_PX = 40;

// 별 산포 — 순장식(aria-hidden). 플랫하게 점만 찍는다(그라데이션·글로우 금지).
const STARS: { top: string; left: string; size: number; color: string }[] = [
  { top: "14%", left: "76%", size: 3, color: "var(--color-star)" },
  { top: "40%", left: "90%", size: 2, color: "#ffffff" },
  { top: "72%", left: "82%", size: 2, color: "#c8bcff" },
  { top: "20%", left: "52%", size: 2, color: "#ffffff" },
  { top: "82%", left: "8%", size: 2, color: "#c8bcff" },
  { top: "60%", left: "64%", size: 2, color: "#ffffff" },
];

// 다크 지면 위 색. 임박은 별빛 골드, 직전은 밝은 빨강 — 흰 지면에서 쓰는 값과 다르다(대비 때문).
const LEVEL_COLOR: Record<CountdownLevel, string> = {
  normal: "rgba(255,255,255,0.75)",
  soon: "#ebc06b",
  critical: "#ff8a8a",
  ended: "rgba(255,255,255,0.4)",
};
const LEVEL_LABEL: Record<CountdownLevel, string> = {
  normal: "지금 판매 중",
  soon: "마감임박",
  critical: "마감임박",
  ended: "종료",
};

function Stars() {
  return (
    <>
      {STARS.map((star, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute rounded-full"
          style={{ top: star.top, left: star.left, width: star.size, height: star.size, background: star.color }}
        />
      ))}
    </>
  );
}

/** 다크 지면용 남은 시간. 서버·클라 첫 렌더를 "표시 없음"으로 맞춰 하이드레이션 미스매치를 피한다. */
function DarkCountdown({ endAt }: { endAt: string }) {
  const [state, setState] = useState<{ label: string; level: CountdownLevel } | null>(null);

  useEffect(() => {
    const update = () => {
      const diffMs = new Date(endAt).getTime() - Date.now();
      setState(diffMs <= 0 ? null : { label: formatRemaining(diffMs), level: countdownLevel(diffMs) });
    };
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, [endAt]);

  if (!state) return null;
  return (
    <span className="tabular-nums" style={{ color: LEVEL_COLOR[state.level] }}>
      마감까지 {state.label}
    </span>
  );
}

function BrandSlide() {
  return (
    <div className="relative">
      <Stars />
      <h2 className="text-[27px] leading-[1.3] tracking-[-0.01em]">
        {BRAND_HEADLINE_LINES.map((line, i) => (
          <span
            key={line}
            className={
              i === BRAND_HEADLINE_LINES.length - 1
                ? "block font-sans font-black text-nebula"
                : "block font-display font-bold text-white"
            }
          >
            {line}
          </span>
        ))}
      </h2>
      <p className="mt-2.5 whitespace-pre-line text-[13px] leading-[1.65] text-white/60">{BRAND_SUBHEAD}</p>
      <Link
        href="/auctions"
        className={`mt-[18px] flex h-11 w-full items-center justify-center rounded-[7px] bg-primary text-sm font-extrabold text-white ${FOCUS_RING}`}
      >
        진행 중인 매물 보기 →
      </Link>
      <Link
        href="/guide"
        className={`mt-3 inline-block border-b border-white/25 pb-px text-[12.5px] font-bold text-white/60 ${FOCUS_RING}`}
      >
        이용 방법 보기
      </Link>
    </div>
  );
}

function AuctionSlide({ auction }: { auction: AuctionResponse }) {
  const level = countdownLevelAt(auction.endAt);

  return (
    <div className="relative flex items-center gap-3.5">
      <Stars />
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center rounded-full border border-white/20 px-2.5 py-[3px] text-[11px] font-bold text-white/85">
          {LEVEL_LABEL[level]}
        </span>
        {auction.artistName && (
          <p className="mt-3 text-[11.5px] font-extrabold tracking-[0.02em] text-nebula">{auction.artistName}</p>
        )}
        <h2 className="mt-1 line-clamp-2 text-[17px] font-extrabold leading-[1.4] tracking-[-0.01em] text-white">
          {auction.title}
        </h2>
        <p className="mt-2.5 flex items-baseline gap-2">
          <span className="text-[11px] font-semibold text-white/50">현재가</span>
          <span className="font-display text-xl font-extrabold leading-tight tabular-nums text-white">
            {formatKRW(auction.currentPrice)}
          </span>
        </p>
        <p className="mt-1.5 flex items-center gap-2 whitespace-nowrap text-[11.5px] text-white/55">
          <span className="tabular-nums">제안 {auction.bidCount}회</span>
          {auction.endAt && <span aria-hidden="true" className="h-0.5 w-0.5 rounded-full bg-white/30" />}
          {auction.endAt && <DarkCountdown endAt={auction.endAt} />}
        </p>
        <Link
          href={`/auctions/${auction.id}`}
          className={`mt-3.5 inline-flex h-11 items-center justify-center whitespace-nowrap rounded-[7px] bg-primary px-4 text-[13.5px] font-extrabold text-white ${FOCUS_RING}`}
        >
          제안하러 가기 →
        </Link>
      </div>
      <div className="aspect-[4/5] w-[108px] flex-shrink-0 overflow-hidden rounded-[12px] border border-white/15 bg-white/[0.06]">
        {auction.representativeThumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
          <img
            src={mediaUrl(auction.representativeThumbnailUrl)}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-white/35" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

export default function MobilePromoBanner({ featured }: { featured: AuctionResponse[] }) {
  // 홍보 매물은 최대 3건 — 그 이상 넘기면 아무도 끝까지 보지 않는다.
  const promoted = featured.slice(0, 3);
  const total = promoted.length + 1;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // 자동 전환 5초. 사용자가 한 번이라도 조작하면 멈춘다 — 읽는 중에 화면이 넘어가지 않게.
  useEffect(() => {
    if (total < 2 || paused || reduceMotion) return;
    const id = setTimeout(() => setIndex((v) => (v + 1) % total), AUTO_MS);
    return () => clearTimeout(id);
  }, [index, total, paused, reduceMotion]);

  function goTo(next: number) {
    setIndex(((next % total) + total) % total);
    setPaused(true);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="메인 배너"
      className="relative overflow-hidden bg-deepspace"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > SWIPE_PX) goTo(index + (dx < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
    >
      <div
        className="flex w-full"
        style={{
          transform: `translateX(-${index * 100}%)`,
          transition: reduceMotion ? "none" : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${total}`}
            aria-hidden={i !== index}
            className="box-border w-full min-w-full flex-[0_0_100%] px-5 pb-11 pt-[26px]"
          >
            {i === 0 ? <BrandSlide /> : <AuctionSlide auction={promoted[i - 1]} />}
          </div>
        ))}
      </div>

      {total > 1 && (
        <div className="absolute bottom-3.5 left-5 flex gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}번 배너로 이동`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={`h-[7px] rounded-full transition-all duration-200 ${FOCUS_RING} ${
                i === index ? "w-5 bg-white" : "w-[7px] bg-white/35"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
