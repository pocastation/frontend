import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AuctionImageGallery from "@/components/AuctionImageGallery";
import AuctionOutbidToggle from "@/components/AuctionOutbidToggle";
import AuctionWishlistButton from "@/components/AuctionWishlistButton";
import BidSection from "@/components/BidSection";
import InstantPurchaseSection from "@/components/InstantPurchaseSection";
import ReportButton from "@/components/ReportButton";
import SearchLink from "@/components/SearchLink";
import SellerReviewSummary from "@/components/SellerReviewSummary";
import SellerShipPanel from "@/components/SellerShipPanel";
import ShareButton from "@/components/ShareButton";
import SuccessionOfferBanner from "@/components/SuccessionOfferBanner";
import { apiFetch, ApiError, mediaUrl } from "@/lib/api";
import { INTERMEDIARY_NOTICE } from "@/lib/business";
import { GRADE_LABEL, SOURCE_LABEL } from "@/lib/labels";
import { ACTION_ICON_BUTTON, FOCUS_RING } from "@/lib/ui";
import type { AuctionDetailResponse } from "@/lib/types";

// cache()로 감싸 generateMetadata와 페이지 본문이 같은 요청에서 한 번만 페치하도록 dedup한다.
const getAuction = cache(async (id: string): Promise<AuctionDetailResponse | null> => {
  try {
    return await apiFetch<AuctionDetailResponse>(`/api/auctions/${id}`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
});

// 링크 미리보기 — 제목·대표사진·설명(스타·유형·현재가). 사진 없으면 기본 OG 이미지(app/opengraph-image) 상속.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const auction = await getAuction(id);
  if (!auction) {
    return { title: "경매를 찾을 수 없어요 — Pocastation" };
  }
  const cover = auction.images?.[0];
  const image = cover ? mediaUrl(cover.displayUrl ?? cover.url) : undefined;
  const description = [
    auction.artistName,
    auction.idolName,
    auction.saleType === "INSTANT" ? "즉시판매" : "경매",
    `현재가 ${auction.currentPrice.toLocaleString("ko-KR")}원`,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    title: `${auction.title} — Pocastation`,
    description,
    openGraph: {
      title: auction.title,
      description,
      type: "website",
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: auction.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

// v0 리톤 — 파스텔 필 제거. 해시태그는 헤어라인 pill + 퍼플 텍스트, 배지는 헤어라인 + 뉴트럴 텍스트로 통일.
const CHIP_CLASS =
  `rounded-full border border-border px-2 py-0.5 text-xs font-bold text-primary transition-colors hover:border-primary ${FOCUS_RING}`;
const BADGE_CLASS = "rounded-full border border-border px-2 py-1 text-xs font-bold text-text-2";

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auction = await getAuction(id);
  if (!auction) {
    notFound();
  }
  const isInstantSale = auction.saleType === "INSTANT";

  // 표 형태 상품 정보 — 우리가 실제로 수집하는 필드만(발매연도·수량 등은 미보유라 제외).
  const specRows: { label: string; value: string }[] = [
    { label: "그룹", value: auction.artistName ?? "-" },
    ...(auction.idolName ? [{ label: "멤버", value: auction.idolName }] : []),
    ...(auction.albumName ? [{ label: "앨범", value: auction.albumName }] : []),
    {
      label: "출처",
      value: SOURCE_LABEL[auction.source] ?? auction.source,
    },
    { label: "상태 등급", value: GRADE_LABEL[auction.grade] ?? auction.grade },
    { label: "미개봉", value: auction.unopened ? "예" : "아니오" },
  ];

  return (
    // 라이브 경매는 모바일 하단 고정 입찰바가 뜨므로, 그 높이만큼 하단 여백을 줘 마지막 콘텐츠가
    // 바에 가리지 않게 한다(모바일에서만, 즉시판매·종료 건에는 불필요).
    <div
      className={`mx-auto max-w-[1160px] px-4 py-6 sm:py-8 ${
        !isInstantSale && auction.status === "LIVE" ? "max-sm:pb-24" : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={isInstantSale ? "/instant-sales" : "/"}
          className={`inline-flex items-center gap-1 rounded-r2 px-1 py-1 text-xs font-semibold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
        >
          <span aria-hidden="true">←</span> {isInstantSale ? "즉시판매 목록으로" : "목록으로"}
        </Link>
        <div className="flex items-center gap-1">
          <ShareButton title={auction.title} />
          <AuctionWishlistButton auctionId={auction.id} className={ACTION_ICON_BUTTON} />
          <ReportButton auctionId={auction.id} />
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {/* 왼쪽: 사진 + 상품 정보 + 판매자 */}
        <div>
          <AuctionImageGallery images={auction.images} title={auction.title} />

          {auction.video && (
            <section className="mt-4">
              <video
                controls
                playsInline
                preload="metadata"
                poster={auction.video.posterUrl ? mediaUrl(auction.video.posterUrl) : undefined}
                src={mediaUrl(auction.video.url)}
                className="aspect-video w-full rounded-r3 border border-border bg-black"
              />
              <p className="mt-1.5 text-xs text-text-3">판매자가 올린 검수영상</p>
            </section>
          )}

          {auction.description && (
            <section className="mt-6">
              <h2 className="text-sm font-bold text-text-1">상품 설명</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-2">
                {auction.description}
              </p>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-sm font-bold text-text-1">상품 정보</h2>
            <div className="mt-2 divide-y divide-border rounded-r3 border border-border">
              {specRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="text-text-3">{row.label}</span>
                  <span className="text-right font-semibold text-text-1">{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          {auction.conditionNote && (
            <section className="mt-6">
              <h2 className="text-sm font-bold text-text-1">하자 안내</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-2">
                {auction.conditionNote}
              </p>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-sm font-bold text-text-1">판매자 정보</h2>
            <div className="mt-2 rounded-r3 border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-r2 bg-surface-2 text-base font-bold text-text-2">
                    {auction.sellerNickname.slice(0, 1).toUpperCase()}
                  </span>
                  <Link
                    href={`/sellers/${auction.sellerId}`}
                    className={`rounded-r2 text-sm font-bold text-text-1 transition-colors hover:text-primary ${FOCUS_RING}`}
                  >
                    {auction.sellerNickname}
                  </Link>
                </div>
                {auction.artistName && (
                  <SearchLink
                    query={auction.artistName}
                    className={`text-xs font-semibold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
                  >
                    {auction.artistName} 다른 경매 보기 →
                  </SearchLink>
                )}
              </div>
              {/* 실제 거래 후기(평균 별점·건수·받은 태그 + 목록). 후기 0건이면 "아직 없어요"로 정직하게(§1). */}
              <SellerReviewSummary sellerId={auction.sellerId} />
            </div>
          </section>
        </div>

        {/* 오른쪽: 제목 · 배지 · 입찰 */}
        <div>
          {/* pill의 좌측 안쪽 여백만큼 라벨 줄을 아웃덴트해, 라벨 텍스트 좌측을 제목(h1)과 맞춘다. */}
          <div className="-ml-2 flex flex-wrap gap-1.5">
            {auction.artistName && (
              <SearchLink query={auction.artistName} className={CHIP_CLASS}>
                #{auction.artistName}
              </SearchLink>
            )}
            {auction.idolName && (
              <SearchLink query={auction.idolName} className={CHIP_CLASS}>
                #{auction.idolName}
              </SearchLink>
            )}
          </div>

          <h1 className="mt-2 font-display text-xl font-extrabold text-text-1 sm:text-2xl">
            {auction.title}
          </h1>

          <div className="-ml-2 mt-3 flex flex-wrap gap-1.5">
            <span className={BADGE_CLASS}>
              {isInstantSale ? "즉시판매" : "경매"}
            </span>
            <span className={BADGE_CLASS}>
              {SOURCE_LABEL[auction.source] ?? auction.source}
              {auction.sourceDetail ? ` · ${auction.sourceDetail}` : ""}
            </span>
            <span className={BADGE_CLASS}>
              {GRADE_LABEL[auction.grade] ?? auction.grade}
            </span>
            {auction.unopened && <span className={BADGE_CLASS}>미개봉</span>}
          </div>

          {isInstantSale ? (
            <InstantPurchaseSection
              saleId={auction.id}
              price={auction.buyNowPrice ?? auction.currentPrice}
              status={auction.status}
              sellerNickname={auction.sellerNickname}
              viewCount={auction.viewCount}
            />
          ) : auction.endAt ? (
            <>
              <BidSection
                auctionId={auction.id}
                initialCurrentPrice={auction.currentPrice}
                initialBidCount={auction.bidCount}
                initialEndAt={auction.endAt}
                maxEndAt={auction.maxEndAt}
                status={auction.status}
                sellerNickname={auction.sellerNickname}
                startPrice={auction.startPrice}
                viewCount={auction.viewCount}
              />
              {auction.status === "LIVE" && (
                <AuctionOutbidToggle auctionId={auction.id} sellerNickname={auction.sellerNickname} />
              )}
              {/* 낙찰(ENDED_SOLD) 후 미결제 확정 시 차순위에게만 승계 제안 배너가 뜬다(대상자 아니면 미노출). */}
              {auction.status === "ENDED_SOLD" && <SuccessionOfferBanner auctionId={auction.id} />}
            </>
          ) : null}
          {/* 전자상거래법 §20 — 중개자 고지는 "입찰·구매 전"에 보여야 해서 결제 영역 바로 아래에 둔다. */}
          <p className="mt-3 text-xs leading-relaxed text-text-3">{INTERMEDIARY_NOTICE}</p>

          {/* 판매자 본인에게만(자체 게이팅) 발송 관리 패널 — 마이페이지 판매내역과 동일 발송 폼을 상세에서도 노출. */}
          {auction.status === "ENDED_SOLD" && <SellerShipPanel auctionId={auction.id} />}
        </div>
      </div>

      <div className="mt-10 flex items-center gap-3 rounded-r3 border border-border bg-surface-2 px-5 py-4 text-sm font-semibold text-text-1">
        안전한 거래를 위해 안내사항을 꼭 확인해주세요.
        <Link href="/guide" className={`ml-auto shrink-0 font-bold text-primary hover:underline ${FOCUS_RING}`}>
          자세히 보기 →
        </Link>
      </div>
    </div>
  );
}
