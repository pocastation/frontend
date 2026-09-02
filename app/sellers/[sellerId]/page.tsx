import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AuctionGrid from "@/components/AuctionGrid";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import SellerReviewSummary from "@/components/SellerReviewSummary";
import { plainLevelLabel } from "@/lib/labels";
import { apiFetch, ApiError } from "@/lib/api";
import { DEFAULT_OG_IMAGE } from "@/lib/site";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionListResponse, SellerRatingResponse } from "@/lib/types";

// 판매자 공개 프로필(#207). 공개 항목은 닉네임·레벨·거래수·평점·판매 중 상품·후기뿐이고
// 실명이나 신뢰점수(0~100) 숫자는 노출하지 않는다(§9.2-4).
const getSeller = cache(async (sellerId: string): Promise<SellerRatingResponse | null> => {
  try {
    return await apiFetch<SellerRatingResponse>(`/api/sellers/${sellerId}/rating`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      return null;
    }
    throw err;
  }
});

async function getSellerAuctions(sellerId: string): Promise<AuctionListResponse | null> {
  try {
    return await apiFetch<AuctionListResponse>(`/api/sellers/${sellerId}/auctions?size=24`, { cache: "no-store" });
  } catch {
    // 상품 목록 실패는 프로필 전체를 죽이지 않는다 — 빈 그리드로 표시.
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ sellerId: string }> }): Promise<Metadata> {
  const { sellerId } = await params;
  const seller = await getSeller(sellerId);
  if (!seller?.nickname) {
    return { title: "판매자를 찾을 수 없어요 — Pocastation" };
  }
  const description = [
    `Lv.${seller.trustLevel} ${plainLevelLabel(seller.trustLevelLabel)}`,
    `거래 ${seller.tradeCount}회`,
    seller.reviewCount > 0 && seller.averageRating !== null
      ? `후기 ${seller.reviewCount}개 · 평점 ${seller.averageRating.toFixed(1)}`
      : "후기 없음",
  ].join(" · ");
  return {
    title: `${seller.nickname} — Pocastation`,
    description,
    // artists/[id]와 같은 이유 — openGraph를 정의하면 루트 OG 이미지가 자동 주입되지 않는다.
    openGraph: {
      title: `${seller.nickname} 판매자`,
      description,
      type: "profile",
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function SellerProfilePage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = await params;
  const [seller, auctions] = await Promise.all([getSeller(sellerId), getSellerAuctions(sellerId)]);
  // 닉네임이 없으면 존재하지 않는 회원 — 집계 API는 없는 id에도 기본값을 주므로 닉네임으로 판별한다.
  if (!seller?.nickname) {
    notFound();
  }

  return (
    <>
      {/*
        뒤로는 **히스토리 뒤로**다(backHref 미지정, #510). 스타 상세를 `/artists` 고정으로 둔 것과
        다른 판단인데, 스타는 목록이 사실상 유일한 진입로지만 **판매자는 매물 상세에서 들어오는
        경우가 더 흔하다** — 그때 랭킹으로 튕기면 보던 매물을 잃는다.
      */}
      <MobilePageHead title={seller.nickname} />

      <div className="mx-auto max-w-[1160px] px-[14px] pb-10 pt-4 sm:px-4 sm:py-8">
        <div className="mb-4 hidden sm:block">
          <Link
            href="/sellers"
            className={`inline-flex items-center gap-1 rounded-r2 px-1 py-1 text-xs font-semibold text-text-3 transition-colors hover:text-text-1 ${FOCUS_RING}`}
          >
            <span aria-hidden="true">←</span> 인기 판매자
          </Link>
        </div>

        {/*
          🔴 프로필을 감싸던 카드를 걷어냈다(#510). 모바일에서 카드는 화면 폭을 거의 다 쓰므로
          감싸는 의미가 없고 여백만 먹는다.

          ⚠️ 8px 회색 띠를 쓰지 않는다. 1차 시안이 섹션을 회색 띠 두 개로 갈랐다가
          「AI티가 난다」고 지적받았다 — 이 레포의 디자인 기준이 나온 2차 반려가 정확히
          「모든 섹션이 같은 골격이라 문서처럼 읽힌다」였다. **구분 장치는 블록마다 다르게 쓴다.**
        */}
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg font-bold text-text-2">
            {seller.nickname.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-extrabold text-text-1">{seller.nickname}</h1>
            <p className="mt-0.5 text-xs text-text-3">
              거래 {seller.tradeCount}회 · 후기 {seller.reviewCount}개
            </p>
          </div>
        </div>
        {/* 레벨·태그는 프로필에 붙고, 그 안에서 헤어라인으로 「받은 후기」가 갈린다. */}
        <SellerReviewSummary sellerId={sellerId} />

        {/*
          매물은 이 화면의 목적지다 — 선이나 띠 대신 **넓은 여백과 큰 제목**으로 무게를 준다.
          위의 후기가 헤어라인 하나로 조용히 붙는 것과 대비된다.
        */}
        <h2 className="mt-9 font-display text-base font-extrabold text-text-1 sm:mt-10">
          판매 중인 상품{" "}
          <span className="text-sm font-bold text-text-3">{auctions?.content.length ?? 0}</span>
        </h2>
        <div className="mt-3">
          <AuctionGrid
            auctions={auctions?.content ?? []}
            variant="compact"
            gridClassName="grid grid-cols-2 gap-x-2 gap-y-[18px] sm:grid-cols-4 sm:gap-x-4"
            emptyTitle="판매 중인 상품이 없어요"
            emptyDescription="이 판매자가 상품을 등록하면 여기에 표시돼요."
          />
        </div>
      </div>
    </>
  );
}
