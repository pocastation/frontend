"use client";

import Link from "next/link";
import AuctionCountdown from "@/components/AuctionCountdown";
import { mediaUrl } from "@/lib/api";
import { formatKRW } from "@/lib/format";
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

// 배너는 **단일 슬롯**이다 — 관리자가 지정한 매물 1건(없으면 홈이 넘겨주는 폴백 1건)만 보여준다.
// 캐러셀(좌우 네비 버튼)은 제거했다: 지정이 없을 때 폴백 여러 건이 들어와 화살표만 떠 있는 상태가 됐고,
// 배너의 목적(관리자가 고른 매물 하나를 강조)과도 맞지 않았다.
export default function Hero({ liveCount, featured }: { liveCount: number; featured: AuctionResponse | null }) {
  const current = featured;
  const { wishlisted, toggle } = useWishlistStatus(current ? [current.id] : []);

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
            LIVE 지금 <strong className="text-white">{liveCount.toLocaleString()}개</strong> 경매 진행 중
          </div>

          <h1 className="font-display text-[clamp(28px,4.5vw,42px)] font-extrabold leading-[1.25] tracking-[-0.02em] text-white">
            <span className="font-sans font-black">K-POP 포토카드</span>
            <br />
            <span style={{ color: "#c8bcff" }}>우주에서 만나는</span>
            <br />
            <span className="font-sans font-black">경매 플랫폼</span>
          </h1>

          <p className="mt-4 text-base leading-relaxed" style={{ color: "#c8bcff" }}>
            희귀 포카부터 한정판 굿즈까지 — 공정한 경매로 진짜 가치를 찾아드립니다.
          </p>

          <div className="mt-8 flex justify-center gap-3 sm:justify-start">
            <Link
              href="#auctions"
              className="inline-flex h-12 items-center justify-center rounded-r2 bg-primary px-7 text-sm font-bold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-deepspace"
            >
              진행 중인 경매 보기 →
            </Link>
            <Link
              href="/guide"
              className="inline-flex h-12 items-center justify-center rounded-r2 border border-white/40 px-7 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-deepspace"
            >
              이용 방법
            </Link>
          </div>
        </div>

        {current && (
          <Link
            href={`/auctions/${current.id}`}
            className="group relative hidden aspect-[4/5] w-72 shrink-0 overflow-hidden rounded-[12px] border border-white/20 transition duration-300 ease-out hover:-translate-y-1.5 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-deepspace motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:block"
          >
            {current.representativeThumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
              <img
                src={mediaUrl(current.representativeThumbnailUrl)}
                alt={current.title}
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
            {current.endAt && <AuctionCountdown endAt={current.endAt} />}

            <WishlistHeart
              auctionId={current.id}
              active={wishlisted.has(current.id)}
              onToggle={(next) => toggle(current.id, next)}
              className="absolute right-3 top-3 z-[2] flex h-7 w-7 items-center justify-center rounded-full text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] hover:text-accent"
            />

            <div className="absolute inset-x-5 bottom-5 z-[2] text-white">
              <p className="truncate text-sm font-bold">{current.artistName ?? current.title}</p>
              <p className="mt-0.5 truncate text-xs text-white/60">{current.title}</p>
              <div className="mt-3 flex items-end justify-between border-t border-white/20 pt-3">
                <div>
                  <p className="text-[10px] text-white/60">현재 입찰가</p>
                  <p className="font-display text-lg font-bold">{formatKRW(current.currentPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/60">입찰</p>
                  <p className="font-display text-sm font-bold">{current.bidCount}회</p>
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
