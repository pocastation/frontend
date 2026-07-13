import { notFound } from "next/navigation";
import Link from "next/link";
import AuctionImageGallery from "@/components/AuctionImageGallery";
import AuctionWishlistButton from "@/components/AuctionWishlistButton";
import BidSection from "@/components/BidSection";
import InstantPurchaseSection from "@/components/InstantPurchaseSection";
import ReportButton from "@/components/ReportButton";
import SearchLink from "@/components/SearchLink";
import ShareButton from "@/components/ShareButton";
import { apiFetch, ApiError } from "@/lib/api";
import { GRADE_LABEL, SOURCE_LABEL } from "@/lib/labels";
import { ACTION_ICON_BUTTON, FOCUS_RING } from "@/lib/ui";
import type { AuctionDetailResponse } from "@/lib/types";

async function getAuction(id: string): Promise<AuctionDetailResponse | null> {
  try {
    return await apiFetch<AuctionDetailResponse>(`/api/auctions/${id}`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

const CHIP_CLASS =
  `rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-white ${FOCUS_RING}`;

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
                <div key={row.label} className="flex items-center justify-between px-3.5 py-2 text-sm">
                  <span className="text-text-3">{row.label}</span>
                  <span className="font-semibold text-text-1">{row.value}</span>
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
            <div className="mt-2 rounded-r3 border border-border p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {auction.sellerNickname.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-text-1">{auction.sellerNickname}</span>
                    {/* 판매자 등급·거래 후기 도메인은 아직 없다 — 모두 기본 등급(LV.1)만 노출하고
                        건수·평점처럼 판매자마다 달라야 할 숫자는 지어내지 않는다. */}
                    <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                      LV.1
                    </span>
                  </span>
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
              <p className="mt-1.5 text-[11px] text-text-3">거래 후기 기능은 준비 중이에요.</p>
            </div>
          </section>
        </div>

        {/* 오른쪽: 제목 · 배지 · 입찰 */}
        <div>
          <div className="flex flex-wrap gap-1.5">
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

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
              {isInstantSale ? "즉시판매" : "경매"}
            </span>
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
              {SOURCE_LABEL[auction.source] ?? auction.source}
              {auction.sourceDetail ? ` · ${auction.sourceDetail}` : ""}
            </span>
            <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs font-bold text-text-2">
              {GRADE_LABEL[auction.grade] ?? auction.grade}
            </span>
            {auction.unopened && (
              <span className="rounded-full bg-ok-soft px-2.5 py-1 text-xs font-bold text-ok">미개봉</span>
            )}
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
          ) : null}
        </div>
      </div>

      <div className="mt-10 flex items-center gap-3 rounded-r3 bg-primary-soft px-5 py-4 text-sm font-semibold text-text-1">
        안전한 거래를 위해 안내사항을 꼭 확인해주세요.
        <Link href="/guide" className={`ml-auto shrink-0 font-bold text-primary hover:underline ${FOCUS_RING}`}>
          자세히 보기 →
        </Link>
      </div>
    </div>
  );
}
