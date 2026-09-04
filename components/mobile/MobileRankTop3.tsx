"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AuctionRow, SellerRow } from "@/components/RankRows";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse, PopularSellerResponse } from "@/lib/types";

/**
 * 홈 랭킹 프리뷰 — 종류별로 1~3위만 보여주고 좌우로 넘겨 본다.
 *
 * <p>**집계가 실제로 있는 것만 올린다.** 지금은 포카(제안 수)와 판매자(신뢰 등급)뿐이고,
 * 스타 랭킹은 매물 수 집계 API가 없어서 넣지 않았다 — 없는 실적을 그럴듯하게 채우지 않는다는
 * 원칙(신뢰가 서비스의 핵심 가치)이 우선이다. 집계가 생기면 페이지를 한 장 더 붙이면 된다.
 *
 * <p>순위 숫자는 1위만 강조하고 2·3위는 뉴트럴이다. 색을 세 개 쓰면 순위가 아니라 색이 보인다.
 */

export default function MobileRankTop3({
  auctions,
  sellers,
}: {
  auctions: AuctionResponse[];
  sellers: PopularSellerResponse[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  // 집계가 비어 있는 종류는 페이지 자체를 만들지 않는다.
  const pages = [
    auctions.length > 0 && {
      key: "포카",
      note: "제안 많은 순",
      href: "/auctions?sort=popular",
      body: auctions.slice(0, 3).map((auction, i) => <AuctionRow key={auction.id} auction={auction} index={i} />),
    },
    sellers.length > 0 && {
      key: "판매자",
      note: "신뢰 등급 순",
      href: "/sellers",
      body: sellers.slice(0, 3).map((seller, i) => <SellerRow key={seller.sellerId} seller={seller} index={i} />),
    },
  ].filter((p): p is { key: string; note: string; href: string; body: React.ReactElement[] } => Boolean(p));

  if (pages.length === 0) return null;

  return (
    <section className="pb-1 pt-[18px]" aria-label="랭킹">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {pages.map((p) => (
          <div key={p.key} className="w-full min-w-full flex-[0_0_100%] snap-start px-[14px]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-baseline gap-1.5 text-base font-extrabold tracking-[-0.02em]">
                {p.key} 랭킹
                <span className="text-[11px] font-semibold text-text-3">{p.note}</span>
              </h2>
              <Link
                href={p.href}
                className={`flex items-center gap-0.5 text-xs font-semibold text-text-3 ${FOCUS_RING}`}
              >
                더보기
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
            <div className="mt-1.5">{p.body}</div>
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
          {pages.map((p, i) => (
            <span
              key={p.key}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === page ? "w-4 bg-text-2" : "w-1.5 bg-border-2"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
