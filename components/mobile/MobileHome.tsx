"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import AuctionCard from "@/components/AuctionCard";
import EventStrip from "@/components/EventStrip";
import MobilePromoBanner from "@/components/mobile/MobilePromoBanner";
import MobileRankTop3 from "@/components/mobile/MobileRankTop3";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse, EventResponse } from "@/lib/types";

/**
 * 모바일 홈 — 국내 커머스 앱 문법으로 짠 별도 화면.
 *
 * <p>데스크탑 홈과 **블록 구성 자체가 다르다**(배너 캐러셀·랭킹은 여기만, 티커·정렬
 * 칩은 데스크탑만). 그래서 같은 트리를 반응형으로 좁히지 않고 이 파일이 배치를 따로 갖는다.
 * 카드·카운트다운·찜·가격 포맷 같은 알맹이는 데스크탑과 **같은 컴포넌트를 그대로 쓴다** —
 * 두 벌로 두는 건 이 배치 파일 하나뿐이다.
 *
 * <p>커머스 앱은 설명하지 않고 보여준다. 섹션 헤드는 제목과 "더보기"뿐이고 부제 문장·정렬
 * 칩을 달지 않는다 — 그건 목록 화면이 할 일이다.
 */

/*
  섹션 사이를 8px 회색 띠로 끊던 것을 걷었다(#741). 섹션이 넷뿐인 화면에서 띠는 끊기보다
  토막 내는 쪽으로 읽힌다.

  대신 간격과 제목이 경계를 나눠 맡는다 — 그냥 지우기만 하면 섹션이 붙어 한 덩어리가 된다.
*/
const SECTION_GAP = "pt-[38px]";

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-[17px] font-extrabold tracking-[-0.02em]">{title}</h2>
      <Link href={href} className={`flex items-center gap-0.5 text-xs font-semibold text-text-3 ${FOCUS_RING}`}>
        더보기
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}

// 좌우 14px, 2열, column-gap 8 / row-gap 18 — 카드에 테두리·그림자를 두르지 않는다.
function Grid({ children }: { children: ReactNode }) {
  return <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-[18px]">{children}</div>;
}

function Empty({ message }: { message: string }) {
  return <p className="py-8 text-center text-[12.5px] text-text-3">{message}</p>;
}

export default function MobileHome({
  featured,
  endingSoon,
  instantSales,
  popularAuctions,
  upcomingEvents,
}: {
  featured: AuctionResponse[];
  endingSoon: AuctionResponse[];
  instantSales: AuctionResponse[];
  popularAuctions: AuctionResponse[];
  upcomingEvents: EventResponse[];
}) {
  // 화면에 깔린 매물의 찜 상태는 한 번에 확인한다(데스크탑 그리드와 같은 훅·같은 캐시).
  const shown = [...endingSoon, ...instantSales];
  const { wishlisted, toggle } = useWishlistStatus(shown.map((a) => a.id));

  return (
    <>
      <MobilePromoBanner featured={featured} />

      {/* 히어로 바로 아래 한 줄(#659). 8px 띠로 끊는 기존 리듬을 그대로 쓴다. */}
      <EventStrip events={upcomingEvents} />

      <section className={`px-[14px] ${SECTION_GAP}`}>
        <SectionHead title="제안판매" href="/auctions?sort=ending_soon" />
        {endingSoon.length > 0 ? (
          <Grid>
            {endingSoon.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                wishlisted={wishlisted.has(auction.id)}
                onToggleWishlist={(next) => toggle(auction.id, next)}
                variant="compact"
              />
            ))}
          </Grid>
        ) : (
          <Empty message="판매 중인 상품이 아직 없어요" />
        )}
      </section>

      <section className={`px-[14px] ${SECTION_GAP}`}>
        <SectionHead title="즉시판매" href="/instant-sales" />
        {instantSales.length > 0 ? (
          <Grid>
            {instantSales.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                wishlisted={wishlisted.has(auction.id)}
                onToggleWishlist={(next) => toggle(auction.id, next)}
                variant="compact"
              />
            ))}
          </Grid>
        ) : (
          <Empty message="등록된 즉시판매가 아직 없어요" />
        )}
      </section>

      {/* 완료된 거래 링크는 홈에서 뺐다(#744). 같은 링크가 거래 탭과 데스크탑 목록에 있어
          진입로는 남고, 홈 맨 아래에서는 순위 다음에 붙은 꼬리로 읽혔다. */}
      <MobileRankTop3 auctions={popularAuctions} />
    </>
  );
}
