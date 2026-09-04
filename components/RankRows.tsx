"use client";

import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { formatKRW } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse, PopularSellerResponse } from "@/lib/types";

/**
 * 랭킹 행 — 모바일 홈(MobileRankTop3)과 데스크탑 홈(HomeRanking)이 함께 쓴다.
 *
 * <p>두 화면의 바깥 골격은 다르다. 모바일은 좌우로 넘기는 한 장짜리 캐러셀이고 데스크탑은
 * 두 목록을 나란히 둔다. 다만 행 자체는 같은 정보를 같은 순서로 말해야 해서 여기로 모았다.
 *
 * <p>순위 숫자는 1위만 강조하고 2·3위는 뉴트럴이다. 색을 세 개 쓰면 순위가 아니라 색이 보인다.
 */

export function RankNumber({ index }: { index: number }) {
  return (
    <span
      className={`w-4 flex-shrink-0 font-display text-sm font-extrabold tabular-nums ${
        index === 0 ? "text-danger" : "text-text-3"
      }`}
    >
      {index + 1}
    </span>
  );
}

export const ROW_CLASS = "flex w-full items-center gap-2.5 border-b border-border py-2.5 text-left";

export function AuctionRow({ auction, index }: { auction: AuctionResponse; index: number }) {
  return (
    <Link href={`/auctions/${auction.id}`} className={`${ROW_CLASS} ${FOCUS_RING}`}>
      <RankNumber index={index} />
      <span className="h-[34px] w-[27px] flex-shrink-0 overflow-hidden rounded-[4px] bg-surface-2">
        {auction.representativeThumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
          <img
            src={mediaUrl(auction.representativeThumbnailUrl)}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        {auction.artistName && (
          <span className="block truncate text-[11px] font-extrabold text-text-3">{auction.artistName}</span>
        )}
        <span className="block truncate text-[12.5px] text-text-1">{auction.title}</span>
      </span>
      <span className="flex-shrink-0 font-display text-[13px] font-extrabold tabular-nums text-text-1">
        {formatKRW(auction.startPrice)}
      </span>
    </Link>
  );
}

export function SellerRow({ seller, index }: { seller: PopularSellerResponse; index: number }) {
  return (
    <Link href={`/sellers/${seller.sellerId}`} className={`${ROW_CLASS} ${FOCUS_RING}`}>
      <RankNumber index={index} />
      <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-bold text-text-2">
        {seller.nickname.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-bold text-text-1">{seller.nickname}</span>
        <span className="block truncate text-[11px] text-text-3">
          거래 {seller.tradeCount.toLocaleString("ko-KR")}건
          {seller.reviewCount > 0 && ` · 후기 ${seller.reviewCount.toLocaleString("ko-KR")}`}
        </span>
      </span>
      <span className="flex-shrink-0 text-[11px] font-bold text-text-3">Lv.{seller.trustLevel}</span>
    </Link>
  );
}
