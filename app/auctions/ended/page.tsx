import AuctionBrowser from "@/components/AuctionBrowser";
import type { SortKey } from "@/components/AuctionExplorer";
import { apiFetch } from "@/lib/api";
import type { AuctionListResponse } from "@/lib/types";

export const metadata = { title: "종료된 경매 — Pocastation" };

// 종료 목록은 진행중과 정렬 의미가 달라 전용 옵션을 쓴다 — 기본은 최근 종료순(백엔드 endAt DESC),
// 가격은 최종 낙찰가(currentPrice) 기준. 백엔드 sort 키(latest/price_desc/price_asc)와 1:1.
// 키는 리터럴로 둔다 — SORT_OPTIONS는 "use client" 모듈 export라 서버 컴포넌트에서 값으로
// 참조하면 런타임에 실제 배열이 아니라 클라이언트 참조 스텁이 넘어온다.
const ENDED_SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최근 종료순" },
  { key: "price_desc", label: "높은 낙찰가" },
  { key: "price_asc", label: "낮은 낙찰가" },
];

async function getEndedAuctions(query: string): Promise<AuctionListResponse | null> {
  const params = new URLSearchParams({ sort: "latest", size: "20" });
  if (query) params.set("q", query);
  try {
    return await apiFetch<AuctionListResponse>(`/api/auctions/ended?${params}`, { cache: "no-store" });
  } catch {
    return null;
  }
}

export default async function EndedAuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const auctions = await getEndedAuctions(query);

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-8 sm:py-10">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">종료된 경매</h1>
        <p className="mt-1.5 text-sm text-text-3">낙찰·유찰로 종료된 경매와 최종 낙찰가를 확인해보세요.</p>
      </div>

      <AuctionBrowser
        key={query}
        endpoint="/api/auctions/ended"
        sortOptions={ENDED_SORT_OPTIONS}
        initialAuctions={auctions?.content ?? []}
        initialTotalElements={auctions?.totalElements ?? 0}
        initialTotalPages={auctions?.totalPages ?? 0}
        initialQuery={query}
        emptyTitle="종료된 경매가 없습니다"
        searchPlaceholder="종료 경매 제목, 스타명, 멤버명으로 검색"
      />
    </div>
  );
}
