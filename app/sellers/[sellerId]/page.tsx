import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AuctionGrid from "@/components/AuctionGrid";
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
    <div className="mx-auto max-w-[1160px] px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href="/sellers"
          className={`inline-flex items-center gap-1 rounded-r2 px-1 py-1 text-xs font-semibold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
        >
          <span aria-hidden="true">←</span> 인기 판매자
        </Link>
      </div>

      {/* 프로필 헤더 — 레벨·거래수·평점·받은 태그·후기 목록은 판매자 카드와 같은 컴포넌트를 재사용한다. */}
      <section className="rounded-r3 border border-border bg-surface p-5">
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
        <SellerReviewSummary sellerId={sellerId} />
      </section>

      <section className="mt-8">
        <h2 className="font-display text-base font-extrabold text-text-1">
          판매 중인 상품{" "}
          <span className="text-sm font-bold text-text-3">{auctions?.content.length ?? 0}</span>
        </h2>
        <div className="mt-3">
          <AuctionGrid
            auctions={auctions?.content ?? []}
            emptyTitle="판매 중인 상품이 없어요"
            emptyDescription="이 판매자가 상품을 등록하면 여기에 표시돼요."
          />
        </div>
      </section>
    </div>
  );
}
