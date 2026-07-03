import AuctionCard from "@/components/AuctionCard";
import { apiFetch } from "@/lib/api";
import type { AuctionListResponse } from "@/lib/types";

async function getAuctions(): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>("/api/auctions", { cache: "no-store" });
  } catch {
    return null;
  }
}

export default async function Home() {
  const auctions = await getAuctions();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 text-center">
        <p className="mb-3 text-xs font-bold tracking-widest text-primary">POCASTATION</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-1 sm:text-4xl">
          K-POP 포토카드 경매
        </h1>
      </div>

      {!auctions || auctions.content.length === 0 ? (
        <p className="py-16 text-center text-sm text-text-3">진행 중인 경매가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {auctions.content.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </div>
  );
}
