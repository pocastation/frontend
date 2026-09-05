import Link from "next/link";
import { AuctionRow, SellerRow } from "@/components/RankRows";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse, PopularSellerResponse } from "@/lib/types";

/**
 * 데스크탑 홈 랭킹 — 포카·판매자 두 목록을 나란히 둔다(#548).
 *
 * <p>모바일 홈에만 있던 블록이라 데스크탑에서는 랭킹을 볼 길이 없었다. 모바일은 좌우로 넘기는
 * 캐러셀인데 넓은 지면에서는 넘길 이유가 없어 두 목록을 함께 편다. 행 자체는 모바일과 같은
 * 컴포넌트를 쓴다.
 *
 * <p>집계가 실제로 있는 것만 올린다. 비어 있는 종류는 칸을 만들지 않고, 둘 다 비면 블록이 없다.
 */
export default function HomeRanking({
  auctions,
  sellers,
}: {
  auctions: AuctionResponse[];
  sellers: PopularSellerResponse[];
}) {
  const columns = [
    auctions.length > 0 && {
      key: "포카",
      note: "제안 많은 순",
      href: "/auctions?sort=popular",
      body: auctions.slice(0, 3).map((auction, i) => <AuctionRow key={auction.id} auction={auction} index={i} />),
    },
    sellers.length > 0 && {
      key: "판매자",
      note: "신뢰 등급 순",
      href: "/sellers",
      body: sellers.slice(0, 3).map((seller, i) => <SellerRow key={seller.sellerId} seller={seller} index={i} />),
    },
  ].filter((c): c is { key: string; note: string; href: string; body: React.ReactElement[] } => Boolean(c));

  if (columns.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1160px] px-4 py-10" aria-label="랭킹">
      <div className={`grid gap-10 ${columns.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {columns.map((c) => (
          <div key={c.key}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="flex items-baseline gap-2 font-display text-xl font-extrabold tracking-[-0.02em] text-text-1">
                {c.key} 랭킹
                <span className="text-[12px] font-semibold text-text-3">{c.note}</span>
              </h2>
              <Link href={c.href} className={`text-xs font-bold text-text-3 hover:text-primary ${FOCUS_RING}`}>
                더보기
              </Link>
            </div>
            {c.body}
          </div>
        ))}
      </div>
    </section>
  );
}
