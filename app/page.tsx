import AuctionExplorer from "@/components/AuctionExplorer";
import AuctionTicker from "@/components/AuctionTicker";
import Hero from "@/components/Hero";
import { apiFetch } from "@/lib/api";
import type { AuctionListResponse } from "@/lib/types";

// 검색/정렬 자체는 서버가 처리(§B1) — 여기서는 첫 화면(검색어 없음·최신순) SSR만 담당하고,
// 이후 검색어·정렬 변경은 AuctionExplorer가 클라이언트에서 재요청한다. "더보기" 페이지네이션
// UI는 아직 없어 한 번에 넉넉히(60건) 가져오는 건 유지 — 매물이 더 늘면 그때 추가.
async function getAuctions(): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>("/api/auctions?size=60", { cache: "no-store" });
  } catch {
    return null;
  }
}

export default async function Home() {
  const auctions = await getAuctions();
  const content = auctions?.content ?? [];

  return (
    <div>
      <Hero liveCount={content.length} featured={content[0] ?? null} />
      <AuctionTicker />
      <AuctionExplorer initialAuctions={content} />
    </div>
  );
}
