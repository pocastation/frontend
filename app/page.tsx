import AuctionExplorer from "@/components/AuctionExplorer";
import AuctionTicker from "@/components/AuctionTicker";
import Hero from "@/components/Hero";
import { apiFetch } from "@/lib/api";
import type { AuctionListResponse } from "@/lib/types";

// 서버 페이지네이션 UI는 아직 없어 한 번에 넉넉히 가져와 클라이언트 검색·정렬로 커버한다
// (매물이 이 규모를 넘어서면 서버 검색/페이지네이션으로 전환 필요 — 지금은 충분).
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
      <AuctionExplorer auctions={content} />
    </div>
  );
}
