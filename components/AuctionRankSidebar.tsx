import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { formatKRW } from "@/lib/format";
import type { AuctionResponse } from "@/lib/types";

// 인기순(=입찰수 desc)은 이미 서버가 지원하는 정렬(sort=popular)을 재사용한 것 — 별도 집계나
// 가짜 순위를 만들지 않는다.
//
// 배치: 본문 컨텐츠(max 1160px) 폭을 먹지 않도록, 우측 빈 여백에 떠서 스크롤을 따라다니는
// 플로팅 바(fixed)로 둔다. 여백이 부족한 화면에선 본문과 겹치므로 1680px 이상에서만 노출한다
// (1160 콘텐츠 + 좌우 여백 260px 확보 지점).
export default function AuctionRankSidebar({ auctions }: { auctions: AuctionResponse[] }) {
  if (auctions.length === 0) return null;

  return (
    <aside className="fixed right-6 top-1/2 z-40 hidden w-[220px] -translate-y-1/2 overflow-hidden rounded-r3 border border-border bg-surface shadow-card min-[1680px]:block">
      <h3 className="border-b border-border bg-surface-2 px-4 py-3 font-display text-sm font-extrabold text-text-1">
        실시간 인기 경매
      </h3>
      <ol className="flex flex-col gap-1 p-2">
        {auctions.slice(0, 5).map((auction, index) => (
          <li key={auction.id}>
            <Link
              href={`/auctions/${auction.id}`}
              className="flex items-center gap-2.5 rounded-r2 px-2 py-1.5 transition-colors hover:bg-surface-2"
            >
              <span className="w-3 shrink-0 text-center text-xs font-extrabold text-text-1">{index + 1}</span>
              <span className="h-10 w-8 shrink-0 overflow-hidden rounded-r1 bg-surface-2">
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
                <span className="block truncate text-[10.5px] text-text-3">
                  {auction.artistName ?? auction.title}
                </span>
                <span className="block truncate font-display text-[11px] font-extrabold text-text-1">
                  {formatKRW(auction.currentPrice)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
