"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import AuctionCard from "@/components/AuctionCard";
import MobilePromoBanner from "@/components/mobile/MobilePromoBanner";
import MobileRankTop3 from "@/components/mobile/MobileRankTop3";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse, PopularSellerResponse } from "@/lib/types";

/**
 * 모바일 홈 — 국내 커머스 앱 문법으로 짠 별도 화면.
 *
 * <p>데스크탑 홈과 **블록 구성 자체가 다르다**(배너 캐러셀·회색 띠·랭킹은 여기만, 티커·정렬
 * 칩은 데스크탑만). 그래서 같은 트리를 반응형으로 좁히지 않고 이 파일이 배치를 따로 갖는다.
 * 카드·카운트다운·찜·가격 포맷 같은 알맹이는 데스크탑과 **같은 컴포넌트를 그대로 쓴다** —
 * 두 벌로 두는 건 이 배치 파일 하나뿐이다.
 *
 * <p>커머스 앱은 설명하지 않고 보여준다. 섹션 헤드는 제목과 "더보기"뿐이고 부제 문장·정렬
 * 칩을 달지 않는다 — 그건 목록 화면이 할 일이다.
 */

// 섹션 사이는 여백이 아니라 8px 회색 띠로 끊는다. 카드로 감싸지 않고 지면을 바꿔 구분한다.
function Band() {
  return <div aria-hidden="true" className="h-2 bg-surface-2" />;
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-extrabold tracking-[-0.02em]">{title}</h2>
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
  return <div className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-[18px]">{children}</div>;
}

function Empty({ message }: { message: string }) {
  return <p className="py-8 text-center text-[12.5px] text-text-3">{message}</p>;
}

export default function MobileHome({
  featured,
  endingSoon,
  instantSales,
  popularAuctions,
  popularSellers,
}: {
  featured: AuctionResponse[];
  endingSoon: AuctionResponse[];
  instantSales: AuctionResponse[];
  popularAuctions: AuctionResponse[];
  popularSellers: PopularSellerResponse[];
}) {
  // 화면에 깔린 매물의 찜 상태는 한 번에 확인한다(데스크탑 그리드와 같은 훅·같은 캐시).
  const shown = [...endingSoon, ...instantSales];
  const { wishlisted, toggle } = useWishlistStatus(shown.map((a) => a.id));

  return (
    <>
      <MobilePromoBanner featured={featured} />

      <section className="px-[14px] pt-[18px]">
        <SectionHead title="마감임박" href="/auctions?sort=ending_soon" />
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
          <Empty message="진행 중인 매물이 아직 없어요" />
        )}
      </section>

      <div className="mt-6">
        <Band />
      </div>

      <section className="px-[14px] pb-6 pt-[18px]">
        <SectionHead title="바로 살 수 있어요" href="/instant-sales" />
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

      <Band />

      <MobileRankTop3 auctions={popularAuctions} sellers={popularSellers} />

      {/* 완료된 거래 진입 — 순위·목록과 성격이 달라 조용한 텍스트 링크 한 줄로 둔다.
          🔴 라벨이 「시세 확인하기」였다. §1.7·§9.4로 성사가를 감추면서 **누르면 시세가
          없는 화면**이 됐다(T40 패턴). MobileBrowse의 같은 링크와 문구를 맞춘다. */}
      <Link
        href="/auctions/ended"
        className={`mt-1.5 block border-t border-border px-[14px] py-4 text-center text-[12.5px] font-bold text-text-2 ${FOCUS_RING}`}
      >
        거래 완료된 매물 보기
      </Link>
    </>
  );
}
