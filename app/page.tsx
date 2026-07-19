import AuctionExplorer from "@/components/AuctionExplorer";
import AuctionRankSidebar from "@/components/AuctionRankSidebar";
import AuctionTicker from "@/components/AuctionTicker";
import Hero from "@/components/Hero";
import { apiFetch } from "@/lib/api";
import type { AuctionListResponse } from "@/lib/types";

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

// "실시간 인기 경매" 사이드바 — 새 집계를 만들지 않고 기존 인기순(sort=popular=입찰수 desc) API를
// 그대로 재사용한다.
async function getPopularAuctions(): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>("/api/auctions?saleType=AUCTION&sort=popular&size=5", { cache: "no-store" });
  } catch {
    return null;
  }
}

// 홈 배너(Hero) — 관리자가 지정(featured)한 LIVE 경매. 없으면 인기 경매로 폴백(#150).
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

export default async function Home() {
  const [auctions, featured, popular, instantSales] = await Promise.all([
    getAuctions(),
    getFeaturedAuctions(),
    getPopularAuctions(),
    getInstantSales(),
  ]);
  const content = auctions?.content ?? [];
  const instantContent = instantSales?.content ?? [];
  // 배너: 관리자 지정(featured) 우선 → 없으면 인기 경매 → 그것도 없으면 최신 라이브 앞부분.
  const featuredContent = featured?.content ?? [];
  const heroFeatured = featuredContent.length
    ? featuredContent.slice(0, 3)
    : (popular?.content?.length ? popular.content.slice(0, 3) : content.slice(0, 3));

  return (
    <div>
      <Hero liveCount={content.length} featured={heroFeatured} />
      <AuctionTicker />
      <AuctionExplorer
        initialAuctions={content}
        sidebar={<AuctionRankSidebar auctions={popular?.content ?? []} />}
      />
      <AuctionExplorer
        initialAuctions={instantContent}
        saleType="INSTANT"
        sectionId="instant-sales"
        title="즉시판매"
        description="마감까지 기다리지 않고 바로 구매할 수 있는 포토카드"
        viewAllHref="/instant-sales"
      />
    </div>
  );
}
