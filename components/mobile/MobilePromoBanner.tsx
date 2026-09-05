"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
// 조작 뒤 쉬는 시간. 스와이프는 넘기려는 뜻이라 짧게, 도트는 「이걸 보겠다」라 길게 쉰다.
const PAUSE_AFTER_SWIPE_MS = 8000;
const PAUSE_AFTER_DOT_MS = 15000;

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
          <span className="text-[11px] font-semibold text-white/50">최소가</span>
          <span className="font-display text-xl font-extrabold leading-tight tabular-nums text-white">
            {formatKRW(auction.startPrice)}
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
      {/* 3:4 · 118px(#550). 예전 108×135(4:5)는 텍스트 열보다 짧아 오른쪽 아래가 비었고,
          목록 카드(3:4)와도 비율이 달라 같은 사진이 다르게 잘렸다. */}
      <div className="aspect-[3/4] w-[118px] flex-shrink-0 overflow-hidden rounded-[6px] border border-white/15 bg-white/[0.06]">
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
  // 홍보 매물은 서버 상한과 같은 5건까지(#552, BE #428). 프론트에서 더 잘라내면 관리자는
  // 지정해 놓고 안 보이는 이유를 알 수 없다 — 건수는 관리자가 정하고 화면은 그대로 반영한다.
  const promoted = featured.slice(0, 5);
  const total = promoted.length + 1;
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  // 화면 밖이면 넘기지 않는다 — 아무도 안 보는 배너가 혼자 돌 이유가 없다.
  const [visible, setVisible] = useState(true);
  /*
    조작 뒤 「언제까지 쉴지」를 시각으로 들고 있다(#550).

    예전에는 boolean 하나였고 `onTouchStart`에서 켜기만 하고 끄는 곳이 없었다 — 세로로 스크롤하려고
    배너를 스치기만 해도 그 세션 동안 자동 넘김이 끝났다. 조작과 통과를 구분하지 못한 것이다.
  */
  const [pausedUntil, setPausedUntil] = useState(0);
  const pagerRef = useRef<HTMLDivElement>(null);
  // 프로그램 스크롤(자동 넘김·도트) 중에는 onScroll이 중간 위치를 읽지 않게 잠근다.
  const navLock = useRef(false);
  const navTarget = useRef(0);
  const navTimer = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = pagerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scrollToIndex = useCallback((next: number, smooth: boolean) => {
    const pager = pagerRef.current;
    if (!pager) return;
    const i = ((next % total) + total) % total;
    const left = i * pager.clientWidth;
    navLock.current = true;
    navTarget.current = left;
    setIndex(i);
    pager.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    // 잠금은 도착하면 풀린다(onPagerScroll). 타이머는 도착 이벤트가 오지 않을 때의 안전장치다.
    window.clearTimeout(navTimer.current);
    navTimer.current = window.setTimeout(() => {
      navLock.current = false;
    }, 1200);
  }, [total]);

  // 자동 전환. 쉬는 중이면 남은 시간만큼 미뤘다가 다시 잡는다 — 멈추는 게 아니라 미루는 것이다.
  useEffect(() => {
    if (total < 2 || reduceMotion || !visible) return;
    const delay = Math.max(AUTO_MS, pausedUntil - Date.now());
    const id = setTimeout(() => scrollToIndex(index + 1, true), delay);
    return () => clearTimeout(id);
  }, [index, total, reduceMotion, visible, pausedUntil, scrollToIndex]);

  const goTo = useCallback((next: number) => {
    setPausedUntil(Date.now() + PAUSE_AFTER_DOT_MS);
    scrollToIndex(next, true);
  }, [scrollToIndex]);

  // 네이티브 스냅이 정착한 지점을 읽는다. 손으로 넘긴 것이면 잠깐 쉰다.
  function onPagerScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (navLock.current) {
      // 목적지에 닿는 순간 잠금을 푼다. 시간으로 풀면 기기가 느릴 때 이동 중 위치를 손조작으로 읽는다.
      if (Math.abs(el.scrollLeft - navTarget.current) < 2) navLock.current = false;
      return;
    }
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index && next >= 0 && next < total) {
      setIndex(next);
      setPausedUntil(Date.now() + PAUSE_AFTER_SWIPE_MS);
    }
  }

  return (
    <section aria-roledescription="carousel" aria-label="메인 배너" className="relative bg-deepspace">
      {/*
        네이티브 가로 스크롤 스냅(#550). 예전에는 `translateX`와 좌표 직접 판정이라 **축 잠금이
        없었다** — 배너를 옆으로 넘기는 동안 세로 스크롤이 같이 움직였다. 네이티브 스크롤은 첫
        제스처의 축을 브라우저가 잠근다. 매물 상세 갤러리(#478)가 같은 이유로 쓰는 방식이다.
      */}
      <div
        ref={pagerRef}
        onScroll={onPagerScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: "pan-x pan-y", scrollBehavior: reduceMotion ? "auto" : undefined }}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${total}`}
            className="box-border w-full min-w-full flex-[0_0_100%] snap-center snap-always px-5 pb-11 pt-[26px]"
          >
            {i === 0 ? <BrandSlide /> : <AuctionSlide auction={promoted[i - 1]} />}
          </div>
        ))}
      </div>

      {total > 1 && (
        <div className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-1.5">
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
