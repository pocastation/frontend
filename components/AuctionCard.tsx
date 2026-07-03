import type { AuctionResponse } from "@/lib/types";
import { formatKRW, formatTimeLeft } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  LIVE: "진행 중",
  ENDED_SOLD: "종료",
  ENDED_NO_BIDS: "유찰",
  SCHEDULED: "시작 예정",
};

export default function AuctionCard({ auction }: { auction: AuctionResponse }) {
  const isLive = auction.status === "LIVE";

  return (
    <article className="overflow-hidden rounded-r4 border border-border bg-surface shadow-card transition-shadow hover:shadow-primary">
      <div className="relative flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-primary-dark to-primary text-5xl">
        🎴
        <span
          className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${
            isLive ? "bg-accent" : "bg-text-3"
          }`}
        >
          {isLive && <span className="h-1 w-1 rounded-full bg-white" />}
          {STATUS_LABEL[auction.status] ?? auction.status}
        </span>
      </div>
      <div className="px-3 py-3">
        <h3 className="truncate text-sm font-bold text-text-1">{auction.title}</h3>
        {isLive && <p className="mt-1 text-[11px] text-text-3">{formatTimeLeft(auction.endAt)}</p>}
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-display text-base font-bold text-text-1">
            {formatKRW(auction.currentPrice)}
          </span>
          <span className="font-display text-[11px] text-text-3">입찰 {auction.bidCount}</span>
        </div>
      </div>
    </article>
  );
}
