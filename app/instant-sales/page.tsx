import AuctionBrowser from "@/components/AuctionBrowser";
import { apiFetch } from "@/lib/api";
import type { AuctionListResponse } from "@/lib/types";

export const metadata = { title: "즉시판매 — Pocastation" };

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
      />
    </div>
  );
}
