import AuctionBrowser from "@/components/AuctionBrowser";
import type { SortKey } from "@/components/AuctionExplorer";
import { apiFetch } from "@/lib/api";
import type { AuctionListResponse } from "@/lib/types";

export const metadata = { title: "즉시판매 — Pocastation" };

// 즉시판매는 카운트다운이 없어 "마감임박" 정렬을 제외한다. 서버 컴포넌트라 SORT_OPTIONS를 값으로
// import하면 크래시("use client" 모듈)라 리터럴로 둔다(종료 페이지와 같은 이유).
const INSTANT_SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "popular", label: "인기순" },
  { key: "views", label: "조회순" },
  { key: "price_asc", label: "낮은 가격" },
  { key: "price_desc", label: "높은 가격" },
];

async function getInstantSales(): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>("/api/auctions?saleType=INSTANT&sort=latest&size=20", {
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export default async function InstantSalesPage() {
  const sales = await getInstantSales();

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-8 sm:py-10">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">즉시판매</h1>
        <p className="mt-1.5 text-sm text-text-3">마감까지 기다리지 않고 바로 구매할 수 있는 포토카드를 확인해보세요.</p>
      </div>

      <AuctionBrowser
        initialAuctions={sales?.content ?? []}
        initialTotalElements={sales?.totalElements ?? 0}
        initialTotalPages={sales?.totalPages ?? 0}
        saleType="INSTANT"
        sortOptions={INSTANT_SORT_OPTIONS}
      />
    </div>
  );
}
