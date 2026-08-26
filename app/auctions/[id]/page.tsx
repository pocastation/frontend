import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AuctionImageGallery from "@/components/AuctionImageGallery";
import AuctionWishlistButton from "@/components/AuctionWishlistButton";
import BidSection from "@/components/BidSection";
import MobileAuctionDetail from "@/components/mobile/MobileAuctionDetail";
import InstantPurchaseSection from "@/components/InstantPurchaseSection";
import ReportButton from "@/components/ReportButton";
import SearchLink from "@/components/SearchLink";
import SellerReviewSummary from "@/components/SellerReviewSummary";
import SellerShipPanel from "@/components/SellerShipPanel";
import ShareButton from "@/components/ShareButton";
import SuccessionOfferBanner from "@/components/SuccessionOfferBanner";
import { AuctionBiddingProvider } from "@/lib/auction-bidding-context";
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
    return { title: "매물을 찾을 수 없어요 — Pocastation" };
  }
  const cover = auction.images?.[0];
  const image = cover ? mediaUrl(cover.displayUrl ?? cover.url) : undefined;
  const description = [
    auction.artistName,
    auction.idolName,
    auction.saleType === "INSTANT" ? "즉시판매" : "제안판매",
    `최소가 ${auction.startPrice.toLocaleString("ko-KR")}원`,
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
      // 정규 주소(#287) — 루트에만 있어 상세는 비어 있었다. 일부 크롤러가 이 값으로 정규 주소를
      // 잡으므로, 추적 파라미터가 붙은 공유 링크가 별개 페이지로 취급되는 것을 막는다.
      url: `/auctions/${id}`,
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
  // 제목 위 상태 줄(#404) — 서버 컴포넌트라 마감 시각 비교 없이 상태값만 본다. 마감을 화면에
  // 표시하지 않기로 했으므로(경매성 제거) 초 단위 정확도가 필요하지 않다.
  const isLive = auction.status === "LIVE";
  // 제안판매(즉시판매 아님)이고 마감시각이 있을 때만 제안 상태를 띄운다. 모바일 상세는 이 컨텍스트를
  // 데스크탑 BidSection과 함께 읽는다 — 상세 하나에 SSE 연결이 둘 열리지 않게.
  const biddable = !isInstantSale && auction.endAt != null;

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

  const actions = (
    <>
      <ShareButton title={auction.title} hashtag={auction.artistName?.replace(/\s+/g, "") || undefined} />
      <AuctionWishlistButton auctionId={auction.id} className={ACTION_ICON_BUTTON} />
      <ReportButton auctionId={auction.id} />
    </>
  );

  const body = (
    <>
      {/* 모바일 전용 상세 — 갤러리가 화면폭을 꽉 채우므로 데스크탑 컨테이너 밖에 둔다. */}
      {biddable && (
        <div className="sm:hidden">
          <MobileAuctionDetail auction={auction} actions={actions} />
        </div>
      )}

    <div
      className={`mx-auto max-w-[1160px] px-4 py-6 sm:py-8 ${biddable ? "max-sm:hidden" : ""} ${
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
          {/* 해시태그는 스타명 하나만 — 공백을 뺀다(X가 첫 공백에서 태그를 끊는다). */}
          <ShareButton
            title={auction.title}
            hashtag={auction.artistName?.replace(/\s+/g, "") || undefined}
          />
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
                    {auction.artistName} 다른 매물 보기 →
                  </SearchLink>
                )}
              </div>
              {/* 실제 거래 후기(평균 별점·건수·받은 태그 + 목록). 후기 0건이면 "아직 없어요"로 정직하게(§1). */}
              <SellerReviewSummary sellerId={auction.sellerId} />
            </div>
          </section>
        </div>

        {/* 오른쪽: 제목 · 배지 · 가격 제안 */}
        <div>
          {/* 🔴 판매 상태(#404) — 모바일은 제목 위 한 줄이 이 역할을 하는데 데스크탑에는 없었다.
              제안 패널 안 초록 도트가 대신하고 있었으나 그건 「AI 티」라 걷어냈고, 지우기만 하면
              데스크탑에서 상태가 통째로 사라진다. 모바일과 같은 자리·같은 문구로 맞춘다. */}
          <p className={`text-[11.5px] font-bold ${isLive ? "text-ok" : "text-text-3"}`}>
            {isLive ? "판매 중" : auction.status === "ENDED_SOLD" ? "거래 완료" : "판매 종료"}
          </p>

          {/* pill의 좌측 안쪽 여백만큼 라벨 줄을 아웃덴트해, 라벨 텍스트 좌측을 제목(h1)과 맞춘다. */}
          <div className="-ml-2 mt-1.5 flex flex-wrap gap-1.5">
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
              {isInstantSale ? "즉시판매" : "제안판매"}
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
              price={auction.buyNowPrice ?? auction.startPrice}
              status={auction.status}
              sellerNickname={auction.sellerNickname}
              viewCount={auction.viewCount}
            />
          ) : auction.endAt ? (
            <>
              <BidSection startPrice={auction.startPrice} />
              {/* 🔴 추월 알림 토글은 폐기했다(§2.3) — 「더 높은 제안이 들어왔어요」는 감추기로 한
                  금액을 흘리고 되받아치라는 신호라 경쟁 호가를 유도한다. 백엔드는 설정 API와
                  테이블까지 걷어냈다(BE #360). */}
              {/* 거래 성사(ENDED_SOLD) 후 미결제 확정 시 차순위에게만 승계 배너가 뜬다(대상자 아니면 미노출). */}
              {auction.status === "ENDED_SOLD" && <SuccessionOfferBanner auctionId={auction.id} />}
            </>
          ) : null}
          {/* 전자상거래법 §20 — 중개자 고지는 "가격 제안·구매 전"에 보여야 해서 결제 영역 바로 아래에 둔다. */}
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
    </>
  );

  if (!biddable) return body;

  return (
    <AuctionBiddingProvider
      auctionId={auction.id}
      startPrice={auction.startPrice}
      initialOfferCount={auction.offerCount}
      initialEndAt={auction.endAt!}
      status={auction.status}
      sellerNickname={auction.sellerNickname}
    >
      {body}
    </AuctionBiddingProvider>
  );
}
