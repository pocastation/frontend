import AuctionExplorer from "@/components/AuctionExplorer";
import EventStrip from "@/components/EventStrip";
import Hero from "@/components/Hero";
import HomeRanking from "@/components/HomeRanking";
import MobileHome from "@/components/mobile/MobileHome";
import MobileShell from "@/components/mobile/MobileShell";
import HomeExchangeGuide from "@/components/HomeExchangeGuide";
import HomeRecentExchanges from "@/components/HomeRecentExchanges";
import { apiFetch } from "@/lib/api";
import { SALE_ENABLED } from "@/lib/preopen";
import { addDays, todayInKst, ymd } from "@/lib/event-dates";
import type { AuctionListResponse, EventListResponse, RecentExchangeResponse } from "@/lib/types";

// 모바일 홈이 한 화면에 올리는 개수. 2열 그리드라 짝수로 둔다.
const MOBILE_SECTION_SIZE = 4;

// 검색/정렬 자체는 서버가 처리(§B1) — 여기서는 첫 화면(검색어 없음·최신순) SSR만 담당하고,
// 이후 검색어·정렬 변경은 AuctionExplorer가 클라이언트에서 재요청한다. "더보기" 페이지네이션
// UI는 아직 없어 한 번에 넉넉히(60건) 가져오는 건 유지 — 매물이 더 늘면 그때 추가.
async function getAuctions(): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>("/api/auctions?saleType=AUCTION&size=60", { cache: "no-store" });
  } catch {
    return null;
  }
}

// 모바일 홈 첫 섹션 — 마감이 가까운 순. 최신 60건을 받아 클라이언트에서 정렬하면 "그 60건 안에서
// 가장 임박한 것"이 되어 매물이 늘수록 틀린 답을 준다. 정렬은 서버에 맡긴다.
async function getEndingSoonAuctions(): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>(
      `/api/auctions?saleType=AUCTION&sort=ending_soon&size=${MOBILE_SECTION_SIZE}`,
      { cache: "no-store" },
    );
  } catch {
    return null;
  }
}

// "실시간 인기 매물" 사이드바 — 새 집계를 만들지 않고 기존 인기순(sort=popular=제안수 desc) API를
// 그대로 재사용한다. 모바일 홈의 포카 랭킹도 같은 응답을 쓴다.
async function getPopularAuctions(): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>("/api/auctions?saleType=AUCTION&sort=popular&size=5", { cache: "no-store" });
  } catch {
    return null;
  }
}

// 홈 배너 — 관리자가 지정(featured)한 LIVE 매물, 순서대로 최대 5건. 데스크탑 Hero(#573)와
// 모바일 배너 둘 다 같은 목록을 캐러셀로 넘긴다. 지정이 없으면 빈 목록이 오고,
// 데스크탑은 아래에서 인기 매물 1건으로 폴백한다(#150). 모바일은 브랜드 카피 한 장만 남는다.
async function getFeaturedAuctions(): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>("/api/auctions/featured?size=5", { cache: "no-store" });
  } catch {
    return null;
  }
}

async function getInstantSales(): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>("/api/auctions?saleType=INSTANT&size=60", { cache: "no-store" });
  } catch {
    return null;
  }
}

// 홈 스트립이 보여주는 2주치 행사(#659). 캘린더로 들어가는 입구라 오늘부터 13일 뒤까지만 받는다.
async function getUpcomingEvents(): Promise<EventListResponse | null> {
  const today = todayInKst();
  try {
    return await apiFetch<EventListResponse>(
      `/api/events?from=${ymd(today)}&to=${ymd(addDays(today, 13))}`,
      { cache: "no-store" },
    );
  } catch {
    return null;
  }
}

// 판매자 랭킹 집계(`/api/sellers/popular`)는 #653에서 걷었다. 홈의 두 랭킹 블록이 유일한 소비처였고
// 인기 판매자를 일반 사용자에게 노출하지 않기로 하면서 화면에서 함께 빠졌다. API는 그대로 살아 있다.

// 홈의 최근 교환글(#798). 가오픈에는 이게 홈의 주인공이다. 실패하면 null이고 화면은
// 블록을 통째로 숨긴다 — 교환글이 없어도 홈은 멀쩡해야 한다.
async function getRecentExchanges(): Promise<RecentExchangeResponse | null> {
  try {
    return await apiFetch<RecentExchangeResponse>("/api/exchanges/recent?size=6", { cache: "no-store" });
  } catch {
    return null;
  }
}

export default async function Home() {
  // 가오픈에는 판매 블록을 아예 두지 않는다(#798). 「준비 중」을 둘씩 띄우면 덜 만든 서비스로
  // 읽히고, 보여줄 수 없는 것을 부르는 질의도 낭비다 — 그래서 가릴 때는 조회부터 건너뛴다.
  const [auctions, featured, popular, instantSales, endingSoon, upcomingEvents, recentExchanges] =
    await Promise.all([
      SALE_ENABLED ? getAuctions() : null,
      SALE_ENABLED ? getFeaturedAuctions() : null,
      SALE_ENABLED ? getPopularAuctions() : null,
      SALE_ENABLED ? getInstantSales() : null,
      SALE_ENABLED ? getEndingSoonAuctions() : null,
      getUpcomingEvents(),
      SALE_ENABLED ? null : getRecentExchanges(),
    ]);
  const content = auctions?.content ?? [];
  const instantContent = instantSales?.content ?? [];
  // 데스크탑 배너 — 관리자 지정(featured) 목록 전체(최대 5, #573)를 넘긴다. 지정이 없을 때만
  // 인기 1위 → 최신 1건으로 폴백하되 **항상 1건**이다: 폴백을 여럿 넘기면 지정하지 않았는데도
  // 캐러셀 도트가 뜬다(#150에서 겪은 상태).
  const featuredList = featured?.content ?? [];
  const heroFallback = popular?.content?.[0] ?? content[0] ?? null;
  const heroFeatured = featuredList.length > 0 ? featuredList : heroFallback ? [heroFallback] : [];

  return (
    // 모바일(sm 미만)에서는 앱 셸이 크롬을 대신한다 — 상단바 48px + 하단 5탭.
    <MobileShell>
      {/*
       * 모바일과 데스크탑은 **블록 구성 자체가 다른 화면**이라 트리를 둘 다 담고 CSS로 가른다
       * (배너 캐러셀·회색 띠·랭킹은 모바일만, 티커·정렬 칩은 데스크탑만).
       * 데이터는 위에서 한 번만 가져와 양쪽에 넘기므로 API 호출이 늘지 않는다.
       */}
      <div className="sm:hidden">
        <MobileHome
          featured={featured?.content ?? []}
          endingSoon={endingSoon?.content ?? []}
          instantSales={instantContent.slice(0, MOBILE_SECTION_SIZE)}
          popularAuctions={popular?.content ?? []}
          upcomingEvents={upcomingEvents?.content ?? []}
          recentExchanges={recentExchanges?.content ?? []}
        />
      </div>

      <div className="hidden sm:block">
        {SALE_ENABLED ? <Hero featured={heroFeatured} /> : <ExchangeHero />}
        {/* 데스크탑은 지면이 넓어 2주 14칸을 한 줄에 편다(#659). */}
        <EventStrip events={upcomingEvents?.content ?? []} />
        {SALE_ENABLED ? (
          <>
            <AuctionExplorer initialAuctions={content} />
            <AuctionExplorer
              initialAuctions={instantContent}
              saleType="INSTANT"
              sectionId="instant-sales"
              title="즉시판매"
              description="마감까지 기다리지 않고 바로 구매할 수 있는 포토카드"
              viewAllHref="/instant-sales"
            />
            {/* 랭킹은 모바일 홈에만 있었다(#548). 데스크탑에서도 볼 수 있게 같은 집계로 블록을 둔다. */}
            <HomeRanking auctions={popular?.content ?? []} />
          </>
        ) : (
          <div className="pg">
            <HomeRecentExchanges posts={recentExchanges?.content ?? []} variant="desktop" />
            <HomeExchangeGuide variant="desktop" />
          </div>
        )}
      </div>
    </MobileShell>
  );
}

/**
 * 가오픈 히어로(#798). 기존 히어로는 관리자가 지정한 판매글을 띄우는 자리라 판매를 가리면
 * 같이 빠진다. 그 자리를 브랜드 면으로 채운다 — 홈 맨 위가 비면 서비스가 비어 보인다.
 */
function ExchangeHero() {
  return (
    <div className="pg pt-page">
      <div className="rounded-card bg-deepspace px-10 py-14">
        <p className="text-label font-semibold text-nebula">공개방송 현장 교환</p>
        <p className="mt-head font-display text-display font-extrabold text-white">현장에서 포카를 바꿔요</p>
        <p className="mt-head text-body-l text-white/80">가려는 공개방송을 고르고, 바꿀 포카를 올려 보세요</p>
      </div>
    </div>
  );
}
