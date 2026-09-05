import Link from "next/link";
import AuctionBrowser from "@/components/AuctionBrowser";
import MobileBrowse from "@/components/mobile/MobileBrowse";
import MobileShell from "@/components/mobile/MobileShell";
import { apiFetch } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionListResponse } from "@/lib/types";

export const metadata = { title: "제안판매 — Pocastation" };

async function getAuctions(query: string): Promise<AuctionListResponse | null> {
  const params = new URLSearchParams({ saleType: "AUCTION", sort: "recommended", size: "20" });
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

  const content = auctions?.content ?? [];
  const totalElements = auctions?.totalElements ?? 0;
  const totalPages = auctions?.totalPages ?? 0;

  return (
    // 모바일과 데스크탑은 지면 구성이 다르다 — 상단 언더라인 탭·정렬 칩 가로스크롤은 모바일만,
    // 큰 제목·넓은 그리드는 데스크탑만. 데이터는 위에서 한 번만 가져와 양쪽에 넘긴다.
    <MobileShell>
      <div className="sm:hidden">
        <MobileBrowse
          key={query}
          initialAuctions={content}
          initialTotalElements={totalElements}
          initialTotalPages={totalPages}
          saleType="AUCTION"
          initialQuery={query}
        />
      </div>

      <div className="mx-auto hidden max-w-[1160px] px-4 py-8 sm:block sm:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">제안판매</h1>
          <p className="mt-1.5 text-sm text-text-3">진행 중인 K-pop 포토카드 매물을 확인하고 가격을 제안해보세요.</p>
        </div>
        <Link
          href="/auctions/ended"
          className={`shrink-0 text-sm font-bold text-text-3 hover:text-primary ${FOCUS_RING}`}
        >
          거래 완료 보기 →
        </Link>
      </div>

      {/* 🔴 제안판매 목록만 「추천순」이 기본이다(§2.4). 끌올이 반영되는 유일한 자리라 여기서만
          넘긴다 — 종료 목록과 즉시판매는 연장·끌올이 없어 그대로 최신순이다. */}
      <AuctionBrowser
        key={query}
        defaultSort="recommended"
        initialAuctions={content}
        initialTotalElements={totalElements}
        initialTotalPages={totalPages}
        initialQuery={query}
      />
      </div>
    </MobileShell>
  );
}
