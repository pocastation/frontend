"use client";

import { useState } from "react";
import Link from "next/link";
import AuctionCountdown from "@/components/AuctionCountdown";
import WishlistHeart from "@/components/WishlistHeart";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionResponse } from "@/lib/types";
import { formatKRW } from "@/lib/format";

// 매물은 카드가 아니다(#277). 번개장터·KREAM 실측 결과 두 서비스 모두 상품 목록에 테두리·그림자·
// 카드 배경이 없고, 라운드는 카드가 아니라 **이미지에** 붙는다. 테두리를 두르면 격자에 수십 장이
// 깔릴 때 상자가 사진보다 먼저 보인다 — 여기서는 이미지와 텍스트 스택만 두고 구분은 여백이 한다.
//
// 타일 비율은 4:5다. 포토카드 실물은 2:3이지만 판매자가 올리는 건 카드가 아니라 **카드를 찍은
// 사진**이고, 휴대폰 세로 사진은 대개 3:4다. 4:5는 그것을 위아래 6.3%만 잘라 담는다(2:3이면
// 좌우 11.1%가 잘려 카드 자체를 자른다).
//
// 상태 표시는 좌상단 칩 하나뿐이다. "진행 중" 배지는 없앴다 — 시계가 돌고 있다는 것이 곧 진행
// 중이라는 뜻이라, 배지를 함께 띄우면 같은 사실을 두 번 말하게 된다.
const OVERLAY_CHIP =
  "absolute left-1.5 top-1.5 z-[2] rounded-[4px] bg-text-1/80 px-1.5 py-0.5 text-[9.5px] font-extrabold leading-[1.35] text-white";

export default function AuctionCard({
  auction,
  wishlisted,
  onToggleWishlist,
}: {
  auction: AuctionResponse;
  wishlisted: boolean;
  onToggleWishlist: (next: boolean) => void;
}) {
  const isLive = auction.status === "LIVE";
  const isInstantSale = auction.saleType === "INSTANT";
  const isEnded = auction.status === "ENDED_SOLD" || auction.status === "ENDED_NO_BIDS";
  const displayPrice = isInstantSale ? (auction.buyNowPrice ?? auction.currentPrice) : auction.currentPrice;

  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const showImage = Boolean(auction.representativeThumbnailUrl) && !imageFailed;

  // 이미지가 하이드레이션 전에 이미 로드/실패를 끝냈으면 onLoad·onError 이벤트를 놓칠 수 있다
  // (브라우저가 SSR HTML을 보고 먼저 로드를 시도) — ref 콜백에서 img.complete를 즉시 확인해
  // 로드 완료/실패 여부를 그 경합에서도 반영한다.
  function syncImageState(img: HTMLImageElement | null) {
    if (!img || !img.complete) return;
    if (img.naturalWidth === 0) setImageFailed(true);
    else setImageLoaded(true);
  }

  return (
    <Link href={`/auctions/${auction.id}`} className={`group block ${FOCUS_RING}`}>
      {/* 라운드는 이 이미지 타일에만 있다. 로딩 전 지면은 단색이다 — 회색 그라디언트는
          이미지가 없다는 사실을 굳이 장식하던 것이라 걷어냈다. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] bg-surface-2">
        {showImage ? (
          <>
            {/* 로딩 중에는 shimmer가 이미지 뒤에서 비친다. 이미지는 항상 불투명하게 두어
             * (SSR 하이드레이션 레이스로 onLoad를 놓쳐도) 절대 투명하게 갇히지 않는다. */}
            {!imageLoaded && <span className="sk-shimmer absolute inset-0" aria-hidden="true" />}
            {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
            <img
              ref={syncImageState}
              src={mediaUrl(auction.representativeThumbnailUrl!)}
              alt={auction.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
            />
          </>
        ) : null}
        {/* URL이 없거나 로드 실패 시 중앙 폴백 아이콘 */}
        {!showImage && (
          <span className="absolute inset-0 flex items-center justify-center text-text-3/70" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </span>
        )}

        {/* 경매는 남은 시간, 즉시판매는 마감이 없으므로 라벨. 둘 다 같은 잉크 칩이라
            오버레이 언어가 하나다. */}
        {isLive && !isInstantSale && auction.endAt && <AuctionCountdown endAt={auction.endAt} />}
        {isLive && isInstantSale && <span className={OVERLAY_CHIP}>즉시구매</span>}

        {/* 거래가 끝난 매물은 칩이 아니라 지면 전체가 상태를 말한다. */}
        {isEnded && (
          <span className="absolute inset-0 z-[2] grid place-items-center bg-white/70 text-xs font-extrabold text-text-2">
            {auction.status === "ENDED_NO_BIDS" ? "유찰" : isInstantSale ? "판매 완료" : "종료"}
          </span>
        )}

        {!isEnded && (
          <WishlistHeart
            auctionId={auction.id}
            active={wishlisted}
            onToggle={onToggleWishlist}
            className={`absolute right-1.5 bottom-1.5 z-[2] flex h-7 w-7 items-center justify-center rounded-full text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-colors hover:text-accent ${FOCUS_RING}`}
          />
        )}
      </div>

      {/* 가격이 첫 줄이다. 경매에서 가장 먼저 읽는 수치가 카드 바닥에서 입찰 횟수와 같은 크기로
          눌려 있었다 — 번개장터가 가격을 제목 위에 두는 순서를 따른다. */}
      <div className="px-0.5 pt-2.5">
        <p className={`font-display text-[17px] font-extrabold tracking-[-0.03em] tabular-nums ${isEnded ? "text-text-3" : "text-text-1"}`}>
          {formatKRW(displayPrice)}
        </p>
        <h3 className="mt-0.5 truncate text-[12.5px] text-text-2">
          {auction.artistName ? `${auction.artistName} ${auction.title}` : auction.title}
        </h3>
        <p className="mt-1 text-[11px] text-text-3">
          {isInstantSale
            ? "즉시구매"
            : auction.status === "ENDED_NO_BIDS"
              ? "입찰 없음"
              : `${auction.bidCount}회 입찰`}
        </p>
      </div>
    </Link>
  );
}
