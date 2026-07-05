import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { formatKRW } from "@/lib/format";
import type { AuctionResponse } from "@/lib/types";

// 인기순(=입찰수 desc)은 이미 서버가 지원하는 정렬(sort=popular)을 재사용한 것 — 별도 집계나
// 가짜 순위를 만들지 않는다.
export default function AuctionRankSidebar({ auctions }: { auctions: AuctionResponse[] }) {
  if (auctions.length === 0) return null;

  return (
    <aside className="rounded-r3 border border-border bg-surface p-2 shadow-card lg:sticky lg:top-20">
      <h3 className="px-2.5 py-2.5 font-display text-sm font-extrabold text-text-1">실시간 인기 경매</h3>
      <ol className="flex flex-col">
        {auctions.map((auction, index) => (
          <li key={auction.id}>
            <Link
              href={`/auctions/${auction.id}`}
              className="flex items-center gap-2.5 rounded-r2 px-2.5 py-2 transition-colors hover:bg-surface-2"
            >
              <span className="w-4 shrink-0 text-center text-xs font-extrabold text-text-3">{index + 1}</span>
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-r1 bg-surface-2">
                {auction.representativeThumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
                  <img
                    src={mediaUrl(auction.representativeThumbnailUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-text-1">
                  {auction.artistName ?? auction.title}
                </span>
                <span className="block truncate text-[10.5px] text-text-3">{auction.title}</span>
              </span>
              <span className="shrink-0 font-display text-xs font-extrabold text-text-1">
                {formatKRW(auction.currentPrice)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
