import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { formatKRW } from "@/lib/format";
import type { AuctionResponse } from "@/lib/types";

export default function Hero({ liveCount, featured }: { liveCount: number; featured: AuctionResponse | null }) {
  return (
    <section className="relative overflow-hidden bg-primary">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 80% at 85% 50%, rgba(244,63,94,.25) 0%, transparent 60%), radial-gradient(ellipse 45% 60% at 5% 85%, rgba(67,48,200,.55) 0%, transparent 50%)",
        }}
        aria-hidden="true"
      />

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

          <div className="mt-6">
            <Link
              href="#auctions"
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-primary transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              경매 둘러보기 →
            </Link>
          </div>
        </div>

        {featured && (
          <Link
            href={`/auctions/${featured.id}`}
            className="w-48 shrink-0 overflow-hidden rounded-r5 border border-white/20 bg-white/10 shadow-modal backdrop-blur-xl transition-transform hover:-translate-y-1.5 hover:rotate-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-[#1e1065] to-[#4c1d95] text-5xl">
              {featured.representativeThumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
                <img
                  src={mediaUrl(featured.representativeThumbnailUrl)}
                  alt={featured.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden="true">🃏</span>
              )}
            </div>
            <div className="border-t border-white/10 p-3.5">
              <p className="truncate text-sm font-bold text-white">
                {featured.artistName ?? featured.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-white/50">{featured.title}</p>
              <p className="mt-2 font-display text-base font-bold text-white">
                {formatKRW(featured.currentPrice)}
              </p>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
