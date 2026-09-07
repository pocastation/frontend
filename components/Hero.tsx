"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuctionCountdown from "@/components/AuctionCountdown";
import { mediaUrl } from "@/lib/api";
import { formatKRW } from "@/lib/format";
import { BRAND_HEADLINE_LINES, BRAND_SUBHEAD } from "@/lib/site";
import { FOCUS_RING } from "@/lib/ui";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import type { AuctionResponse } from "@/lib/types";
import WishlistHeart from "@/components/WishlistHeart";

// 브랜드 서사(포카+스테이션 = 우주 정거장): 히어로는 딥스페이스 밤하늘 캔버스다. 그라데이션·글로우 없이
// 단색 위에 별빛만 흩뿌린다 — 흰·연보라 별점 다수 + 흰·연보라 4각 별(✦) 소수.
// 좌표·크기는 고정 배열로 둔다(장식이라 aria-hidden). 별에 한해 아주 옅은 글로우(box-shadow)는 허용.
// 좌표는 좌측 텍스트 컬럼(대략 left 3~50% · top 15~80%)을 피해 상단 띠·우측·하단에만 둔다 —
// 별이 헤드라인/버튼 위로 겹치지 않게. 우측 별 일부는 featured 카드 뒤로 가려질 수 있으나 무방하다.
const STAR_DOTS: { top: string; left: string; size: number; lav?: boolean }[] = [
  { top: "4%", left: "12%", size: 2 },
  { top: "7%", left: "31%", size: 2, lav: true },
  { top: "5%", left: "50%", size: 2 },
  { top: "9%", left: "63%", size: 3, lav: true },
  { top: "6%", left: "82%", size: 2 },
  { top: "3%", left: "94%", size: 2, lav: true },
  { top: "30%", left: "92%", size: 3 },
  { top: "52%", left: "88%", size: 2, lav: true },
  { top: "68%", left: "95%", size: 3 },
  { top: "44%", left: "56%", size: 2, lav: true },
  { top: "90%", left: "22%", size: 2, lav: true },
  { top: "88%", left: "47%", size: 3 },
  { top: "92%", left: "76%", size: 2, lav: true },
  { top: "5%", left: "6%", size: 2 },
];

const STAR_SPARKLES: { top: string; left: string; size: number; lav?: boolean }[] = [
  { top: "8%", left: "40%", size: 11 },
  { top: "72%", left: "67%", size: 9, lav: true },
  { top: "22%", left: "93%", size: 13 },
];

/*
  넘김 규칙은 모바일 배너(MobilePromoBanner, T68)와 같은 값을 쓴다 — 두 지면이 같은 데이터를
  다른 리듬으로 넘기면 「데스크탑에서는 왜 더 빨리 넘어가나」가 된다.
  데스크탑에만 있는 조작은 호버·포커스다: 카드에 가격·마감이 실려 있어 읽는 중에 넘어가지 않게
  마우스가 올라와 있는 동안은 멈춘다(시안 승인 2026-09-07).
*/
const AUTO_MS = 5000;
const PAUSE_AFTER_DOT_MS = 15000;

// 배너 슬롯 — 관리자가 지정한 매물 최대 5건을 캐러셀로 넘긴다(#573). 예전에는 단일 슬롯이라 순서 1번만
// 보였는데, 관리자가 순서까지 정해 올린 나머지 4건이 데스크탑에서는 존재하지 않는 셈이었다.
//
// 지정이 1건 이하면 도트·화살표 없이 예전과 같은 화면이다. 홈이 넘기는 폴백(인기 1위·최신 1건)은 언제나
// 1건이라 캐러셀이 되지 않는다 — 지정하지 않았는데 조작 UI가 뜨던 #150 문제를 다시 만들지 않는다.
// 카드 아래 한 줄은 왼쪽 도트 · 오른쪽 화살표 쌍이다(#576). 화살표는 도트를 정확히 누르지 않아도
// 이전·다음으로 갈 수 있는 길이고, 움직임 줄이기(reduced-motion)로 자동 넘김이 없는 사용자에게는 유일한
// 눈에 보이는 이동 수단이다.
export default function Hero({ liveCount, featured }: { liveCount: number; featured: AuctionResponse[] }) {
  const slides = featured.slice(0, 5);
  const total = slides.length;
  const { wishlisted, toggle } = useWishlistStatus(slides.map((a) => a.id));

  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  // 마우스·포커스가 카드 위에 있는 동안은 자동 넘김을 멈춘다. 벗어나면 다음 턴부터 재개.
  const [hovering, setHovering] = useState(false);
  // 도트로 골랐으면 「이걸 보겠다」는 뜻이라 한동안 쉰다(모바일과 같은 15초).
  const [pausedUntil, setPausedUntil] = useState(0);
  const pagerRef = useRef<HTMLDivElement>(null);
  // 프로그램 스크롤 중에는 onScroll이 중간 위치를 읽지 않게 잠근다(모바일 배너와 같은 장치).
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

  // 탭이 뒤로 가면 멈춘다 — 아무도 안 보는 배너가 혼자 도는 동안 위치만 바뀌어 있으면 돌아왔을 때 어색하다.
  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const scrollToIndex = useCallback((next: number, smooth: boolean) => {
    const pager = pagerRef.current;
    if (!pager || total < 1) return;
    const i = ((next % total) + total) % total;
    const left = i * pager.clientWidth;
    navLock.current = true;
    navTarget.current = left;
    setIndex(i);
    pager.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    window.clearTimeout(navTimer.current);
    navTimer.current = window.setTimeout(() => {
      navLock.current = false;
    }, 1200);
  }, [total]);

  // 자동 전환 — 멈추는 게 아니라 미루는 것이다. 쉬는 시간이 남았으면 그만큼 뒤에 다시 잡는다.
  useEffect(() => {
    if (total < 2 || reduceMotion || !visible || hovering) return;
    const delay = Math.max(AUTO_MS, pausedUntil - Date.now());
    const id = setTimeout(() => scrollToIndex(index + 1, !reduceMotion), delay);
    return () => clearTimeout(id);
  }, [index, total, reduceMotion, visible, hovering, pausedUntil, scrollToIndex]);

  const goTo = useCallback((next: number) => {
    setPausedUntil(Date.now() + PAUSE_AFTER_DOT_MS);
    scrollToIndex(next, true);
  }, [scrollToIndex]);

  function onPagerScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (navLock.current) {
      if (Math.abs(el.scrollLeft - navTarget.current) < 2) navLock.current = false;
      return;
    }
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index && next >= 0 && next < total) {
      setIndex(next);
      setPausedUntil(Date.now() + PAUSE_AFTER_DOT_MS);
    }
  }

  // 도트에 포커스가 있을 때 ← →로 이동한다. 화살표 버튼과 별개로 키보드 길도 남긴다.
  function onDotsKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = e.key === "ArrowLeft" ? index - 1 : index + 1;
    goTo(next);
    const dots = e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
    dots[((next % total) + total) % total]?.focus();
  }

  return (
    <section className="relative overflow-hidden bg-deepspace text-white">
      {/* 밤하늘 별빛 — 순장식(aria-hidden). 흰·연보라 점 + 4각 별(✦). */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {STAR_DOTS.map((s, i) => (
          <span
            key={`d${i}`}
            className="absolute rounded-full"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              background: s.lav ? "#c8bcff" : "#ffffff",
              boxShadow: `0 0 ${s.size + 2}px ${s.lav ? "rgba(200,188,255,.7)" : "rgba(255,255,255,.8)"}`,
            }}
          />
        ))}
        {STAR_SPARKLES.map((s, i) => (
          <span
            key={`s${i}`}
            className="absolute leading-none"
            style={{ top: s.top, left: s.left, fontSize: s.size, color: s.lav ? "#c8bcff" : "#ffffff" }}
          >
            ✦
          </span>
        ))}
      </div>

      <div className="relative mx-auto flex max-w-[1160px] flex-col items-center gap-12 px-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
        <div className="max-w-[560px] text-center sm:text-left">
          <div className="mb-5 inline-flex items-center gap-2 rounded-r1 border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-white/90">
            <span className="h-2 w-2 animate-pulse rounded-full bg-ok" aria-hidden="true" />
            LIVE 지금 <strong className="text-white">{liveCount.toLocaleString()}개</strong> 거래 진행 중
          </div>

          {/* 브랜드 문장은 모바일 홍보 배너 1장과 **같은 것을 쓴다**(lib/site.ts). 지면 크기만
              여기서 키우고, 줄 나눔과 «마지막 줄만 강조»는 공유한다. */}
          <h1 className="font-display text-[clamp(28px,4.5vw,42px)] font-extrabold leading-[1.25] tracking-[-0.02em] text-white">
            {BRAND_HEADLINE_LINES.map((line, i) => (
              <span
                key={line}
                className={
                  i === BRAND_HEADLINE_LINES.length - 1
                    ? "block font-sans font-black text-nebula"
                    : "block"
                }
              >
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-white/60">{BRAND_SUBHEAD}</p>

          <div className="mt-8 flex justify-center gap-3 sm:justify-start">
            <Link
              href="#auctions"
              className="inline-flex h-12 items-center justify-center rounded-r2 bg-primary px-7 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-deepspace"
            >
              진행 중인 매물 보기 →
            </Link>
            <Link
              href="/guide"
              className="inline-flex h-12 items-center justify-center rounded-r2 border border-white/40 px-7 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-deepspace"
            >
              이용 방법
            </Link>
          </div>
        </div>

        {total > 0 && (
          <div
            className="hidden w-72 shrink-0 sm:block"
            aria-roledescription={total > 1 ? "carousel" : undefined}
            aria-label={total > 1 ? "추천 매물 배너" : undefined}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onFocus={() => setHovering(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovering(false);
            }}
          >
            {/*
              네이티브 가로 스크롤 스냅 — 모바일 배너(#550)·매물 상세 갤러리(#478)와 같은 방식.
              카드 폭(288px)이 곧 슬롯 폭이라 scrollLeft / clientWidth가 곧 index다.
              1건이면 스크롤할 것이 없어 지금까지의 단일 카드와 같다.
            */}
            <div
              ref={pagerRef}
              onScroll={onPagerScroll}
              className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollBehavior: reduceMotion ? "auto" : undefined }}
            >
              {slides.map((auction, i) => (
                <div
                  key={auction.id}
                  role={total > 1 ? "group" : undefined}
                  aria-roledescription={total > 1 ? "slide" : undefined}
                  aria-label={total > 1 ? `${i + 1} / ${total}` : undefined}
                  className="box-border w-full min-w-full flex-[0_0_100%] snap-center snap-always"
                >
                  <HeroCard
                    auction={auction}
                    wishlisted={wishlisted.has(auction.id)}
                    onToggleWishlist={(next) => toggle(auction.id, next)}
                  />
                </div>
              ))}
            </div>

            {/*
              조작 줄 — 왼쪽 도트(모바일 배너와 같은 7px 점, 활성 20px 막대), 오른쪽 화살표 쌍(시안 C안).
              화살표는 셰브론 10px에 히트 영역 24px이라 셰브론이 카드 오른쪽 모서리에 닿도록 7px 안쪽으로
              당긴다. 쉬는 상태는 비활성 도트와 같은 흰 35%, 호버·포커스에 흰 100%. 카운터는 두지 않는다.
            */}
            {total > 1 && (
              <div className="mt-3.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5" onKeyDown={onDotsKeyDown}>
                  {slides.map((auction, i) => (
                    <button
                      key={auction.id}
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
                <div className="-mr-[7px] flex items-center gap-0.5">
                  <ArrowButton label="이전 배너" direction="prev" onClick={() => goTo(index - 1)} />
                  <ArrowButton label="다음 배너" direction="next" onClick={() => goTo(index + 1)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// 이전·다음 화살표 — 원·테두리·배경 없이 셰브론만. 끝에서는 순환하므로 비활성 상태가 없다.
function ArrowButton({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-6 w-6 place-items-center rounded-full text-white/35 transition-colors duration-200 hover:text-white focus-visible:text-white ${FOCUS_RING}`}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {direction === "prev" ? <path d="M6.5 1.5 3 5l3.5 3.5" /> : <path d="M3.5 1.5 7 5 3.5 8.5" />}
      </svg>
    </button>
  );
}

// 카드 한 장 — 지정 매물의 대표 사진 + 스타명·상품명·최소 제안가·제안 수. 단일 슬롯 시절의 카드 그대로다.
function HeroCard({
  auction,
  wishlisted,
  onToggleWishlist,
}: {
  auction: AuctionResponse;
  wishlisted: boolean;
  onToggleWishlist: (next: boolean) => void;
}) {
  return (
    <Link
      href={`/auctions/${auction.id}`}
      className="group relative block aspect-[4/5] w-72 overflow-hidden rounded-[12px] border border-white/20 transition duration-300 ease-out hover:-translate-y-1.5 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-deepspace motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {auction.representativeThumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
        <img
          src={mediaUrl(auction.representativeThumbnailUrl)}
          alt={auction.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-white/5 text-white/40" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </span>
      )}
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.82) 100%)" }}
        aria-hidden="true"
      />

      {/* 목록 카드는 이미 흰 pill + 도트에서 잉크 시계 칩으로 정리했는데 여기만 보라 필
          배지로 남아 있었다 — 같은 요소가 두 언어를 쓰던 셈이라 같은 칩으로 맞춘다(#277). */}
      {auction.endAt && <AuctionCountdown endAt={auction.endAt} />}

      <WishlistHeart
        auctionId={auction.id}
        active={wishlisted}
        onToggle={onToggleWishlist}
        className="absolute right-3 top-3 z-[2] flex h-7 w-7 items-center justify-center rounded-full text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] hover:text-accent"
      />

      <div className="absolute inset-x-5 bottom-5 z-[2] text-white">
        <p className="truncate text-sm font-bold">{auction.artistName ?? auction.title}</p>
        <p className="mt-0.5 truncate text-xs text-white/60">{auction.title}</p>
        <div className="mt-3 flex items-end justify-between border-t border-white/20 pt-3">
          <div>
            <p className="text-[10px] text-white/60">현재 제안가</p>
            <p className="font-display text-lg font-bold">{formatKRW(auction.startPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/60">제안</p>
            <p className="font-display text-sm font-bold">{auction.bidCount}회</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
