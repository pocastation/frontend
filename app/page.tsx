import AuctionExplorer from "@/components/AuctionExplorer";
import AuctionTicker from "@/components/AuctionTicker";
import Hero from "@/components/Hero";
import MobileHome from "@/components/mobile/MobileHome";
import MobileShell from "@/components/mobile/MobileShell";
import { apiFetch } from "@/lib/api";
import type { AuctionListResponse, PopularSellerResponse } from "@/lib/types";

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

// "실시간 인기 경매" 사이드바 — 새 집계를 만들지 않고 기존 인기순(sort=popular=입찰수 desc) API를
// 그대로 재사용한다. 모바일 홈의 포카 랭킹도 같은 응답을 쓴다.
async function getPopularAuctions(): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>("/api/auctions?saleType=AUCTION&sort=popular&size=5", { cache: "no-store" });
  } catch {
    return null;
  }
}

// 홈 배너 — 관리자가 지정(featured)한 LIVE 경매. 데스크탑 Hero는 단일 슬롯이라 첫 건만 쓰고,
// 모바일 배너는 캐러셀이라 여러 건을 슬라이드로 넘긴다. 지정이 없으면 빈 목록이 오고,
// 데스크탑은 아래에서 인기 경매로 폴백한다(#150). 모바일은 브랜드 카피 한 장만 남는다.
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

// 모바일 홈의 판매자 랭킹 — 신뢰 등급 순(trustScore desc). 상위 3명만 쓴다.
async function getPopularSellers(): Promise<PopularSellerResponse[]> {
  try {
    return await apiFetch<PopularSellerResponse[]>("/api/sellers/popular?size=3", { cache: "no-store" });
  } catch {
    return [];
  }
}

export default async function Home() {
  const [auctions, featured, popular, instantSales, endingSoon, popularSellers] = await Promise.all([
    getAuctions(),
    getFeaturedAuctions(),
    getPopularAuctions(),
    getInstantSales(),
    getEndingSoonAuctions(),
    getPopularSellers(),
  ]);
  const content = auctions?.content ?? [];
  const instantContent = instantSales?.content ?? [];
  // 배너는 한 자리다 — 관리자 지정(featured) 1건 우선 → 없으면 인기 1위 → 그것도 없으면 최신 1건.
  // 여러 건을 넘기면 Hero가 캐러셀이 되어, 지정하지 않았는데도 네비 버튼이 뜨는 상태가 됐었다.
  const heroFeatured =
    featured?.content?.[0] ?? popular?.content?.[0] ?? content[0] ?? null;

  return (
    // 모바일(sm 미만)에서는 앱 셸이 크롬을 대신한다 — 상단바 48px + 하단 5탭.
    <MobileShell active="홈">
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
          popularSellers={popularSellers}
        />
      </div>

      <div className="hidden sm:block">
        <Hero liveCount={content.length} featured={heroFeatured} />
        <AuctionTicker />
        <AuctionExplorer initialAuctions={content} />
        <AuctionExplorer
          initialAuctions={instantContent}
          saleType="INSTANT"
          sectionId="instant-sales"
          title="즉시판매"
          description="마감까지 기다리지 않고 바로 구매할 수 있는 포토카드"
          viewAllHref="/instant-sales"
        />
      </div>
    </MobileShell>
  );
}
