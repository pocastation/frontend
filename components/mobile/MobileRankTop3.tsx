"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AuctionRow } from "@/components/RankRows";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse } from "@/lib/types";

/**
 * 홈 랭킹 프리뷰 — 종류별로 1~3위만 보여주고 좌우로 넘겨 본다.
 *
 * <p>**집계가 실제로 있는 것만 올린다.** 지금은 포카(제안 수)뿐이고, 스타 랭킹은 매물 수 집계
 * API가 없어서 넣지 않았다 — 없는 실적을 그럴듯하게 채우지 않는다는 원칙(신뢰가 서비스의 핵심
 * 가치)이 우선이다. 집계가 생기면 페이지를 한 장 더 붙이면 된다.
 *
 * <p>판매자(신뢰 등급) 장은 #653에서 뺐다. 집계가 없어서가 아니라 인기 판매자를 일반 사용자에게
 * 노출하지 않기로 해서다. 장이 하나면 도트도 뜨지 않으므로 캐러셀 골격은 그대로 둔다.
 *
 * <p>순위 숫자는 1위만 강조하고 2·3위는 뉴트럴이다. 색을 세 개 쓰면 순위가 아니라 색이 보인다.
 */

export default function MobileRankTop3({ auctions }: { auctions: AuctionResponse[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  // 집계가 비어 있는 종류는 페이지 자체를 만들지 않는다.
  // 비어도 장을 그린다(#724). 근거는 HomeRanking의 주석과 같다.
  const pages = [
    {
      key: "포카",
      note: "제안 많은 순",
      href: "/auctions?sort=popular",
      body:
        auctions.length > 0 ? (
          auctions.slice(0, 3).map((auction, i) => <AuctionRow key={auction.id} auction={auction} index={i} />)
        ) : (
          /* 윗선을 두지 않는다(#741). 줄이 있을 때는 각 줄의 아랫선만 그어져 제목 밑에 선이
             생기지 않는데, 빈 상태에만 윗선이 있으면 같은 자리에서 선이 나타났다 사라진다. */
          <p className="py-8 text-center text-[12.5px] text-text-3">제안이 쌓이면 순위가 나와요.</p>
        ),
    },
  ];

  return (
    <section className="pb-1 pt-[38px]" aria-label="랭킹">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {pages.map((p) => (
          <div key={p.key} className="w-full min-w-full flex-[0_0_100%] snap-start px-[14px]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-baseline gap-1.5 text-[17px] font-extrabold tracking-[-0.02em]">
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
