import AuctionBrowser from "@/components/AuctionBrowser";
import { apiFetch } from "@/lib/api";
import type { AuctionListResponse } from "@/lib/types";

export const metadata = { title: "경매 — Pocastation" };

async function getAuctions(query: string): Promise<AuctionListResponse | null> {
  const params = new URLSearchParams({ saleType: "AUCTION", sort: "latest", size: "20" });
  if (query) params.set("q", query);
  try {
    return await apiFetch<AuctionListResponse>(`/api/auctions?${params}`, { cache: "no-store" });
  } catch {
    return null;
  }
}

// 헤더 검색(제출)이 /auctions?q=검색어로 넘겨준다 — 그 검색어로 SSR 조회하고 AuctionBrowser의
// 로컬 검색창 초기값으로도 넘겨, 진입 즉시 검색 상태가 화면과 일치하게 한다.
export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const auctions = await getAuctions(query);

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-8 sm:py-10">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">경매</h1>
        <p className="mt-1.5 text-sm text-text-3">진행 중인 K-pop 포토카드 경매를 확인하고 입찰해보세요.</p>
      </div>

      <AuctionBrowser
        key={query}
        initialAuctions={auctions?.content ?? []}
        initialTotalElements={auctions?.totalElements ?? 0}
        initialTotalPages={auctions?.totalPages ?? 0}
        initialQuery={query}
      />
    </div>
  );
}
