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
      {/* 🔴 「← 목록으로」는 없앴고 동작 아이콘은 우측 컬럼 안으로 들어갔다(#406).
          그 줄이 그리드 위에 있는 동안에는 우측 시트가 **처음 90px을 같이 끌려 올라간 뒤** 붙어서,
          「스크롤과 무관하게 고정」이 되지 못했다. 줄을 걷어내면 그리드가 곧바로 시작해
          시트의 제자리(헤더 60 + 페이지 여백 32 = 92px)와 붙는 자리가 같아진다 — 드리프트 0.
          되돌아가는 길은 헤더 내비게이션과 브라우저 뒤로가기가 맡는다.

          ⚠️ 아래 줄은 **모바일 폭 전용**이다. 즉시판매는 이 트리가 한 컬럼으로 쌓이는데,
          아이콘을 우측 컬럼에만 두면 사진·상품정보·판매자정보를 다 지난 뒤에야 나온다. */}
      <div className="mb-3 flex items-center justify-end gap-1 sm:hidden">{actions}</div>

      {/* 🔴 items-start(#406) — grid 셀은 기본이 stretch라 셀 높이가 늘 트랙 높이와 같다.
          그 상태에서는 아래쪽에 스크롤할 여지가 없어 우측 sticky가 붙어도 움직이지 않는다. */}
      <div className="grid items-start gap-8 sm:grid-cols-2">
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

          {/* 🔴 제목이 「상품 설명」에서 「상세 설명」으로 바뀐 이유(#406) — 등록 폼의 필드 이름이
              그것이다. 화면이 폼과 다른 이름으로 부르면 판매자는 자기가 쓴 글이 어디로 갔는지 모른다. */}
          {auction.description && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-text-1">상세 설명</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-2">
                {auction.description}
              </p>
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-display text-xl font-bold text-text-1">상품 정보</h2>
            {/* 🔴 카드를 걷고 규칙선만 남긴다(#406). 한 페이지에 강조 패널은 하나면 충분한데
                우측 제안 패널이 이미 그 자리라, 스펙표까지 테두리를 두르면 둘이 경쟁한다.
                2열로 접으면 6줄이 3줄이 되고, 라벨 폭을 고정해 값이 같은 자리에서 시작한다. */}
            <dl className="mt-2 grid border-t border-border sm:grid-cols-2">
              {specRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[92px_1fr] gap-3 border-b border-border py-3 text-sm"
                >
                  <dt className="text-text-3">{row.label}</dt>
                  <dd className="font-semibold text-text-1">{row.value}</dd>
                </div>
              ))}
              {/* 홀수 줄이면 2열 마지막 칸이 비어 아래 규칙선이 반만 그어진다 — 빈 칸이 선을 잇는다. */}
              {specRows.length % 2 === 1 && (
                <div className="hidden border-b border-border sm:block" aria-hidden="true" />
              )}
            </dl>
          </section>

          {/* 🔴 「하자 안내」(conditionNote) 섹션은 지웠다(#406) — **등록 폼이 더 이상 그 값을 받지 않는다.**
              「상세 설명 (선택)」 하나로 합쳐졌고, 그 placeholder가 하자·상태를 함께 적으라고 안내한다.
              모바일 상세는 이미 빼고 있어서 데스크탑만 없어진 필드를 위한 제목을 들고 있었다.
              ⚠️ 통합 이전에 등록된 매물의 conditionNote는 화면에서 보이지 않게 된다(로컬 2건). */}

          <section className="mt-8">
            <h2 className="font-display text-xl font-bold text-text-1">판매자 정보</h2>
            <div className="mt-3 rounded-r3 border border-border p-4">
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

        {/* 오른쪽: 제목 · 배지 · 가격 제안. 데스크탑에서만 따라온다 — 모바일 폭에서는 이 트리가
            통째로 숨거나(제안판매) 한 컬럼으로 쌓이므로(즉시판매) 붙일 자리가 없다.
            🔴 **오프셋이 헤더를 비켜야 한다**(#406). `.hdr`이 이미 `sticky top-0`(높이 60px)이라
            top-4(16px)로 두면 스크롤할 때 「판매 중」 줄과 해시태그가 헤더 뒤로 들어가 사라진다 —
            고정은 되는데 위쪽이 잘리니 「고정된 것 같지 않은」 움직임이 된다.
            60px(헤더) + 16px(숨 쉴 틈) = 76px. 헤더 높이가 바뀌면 여기도 함께 바꿀 것.
            높이 제한은 함께 둔다: 뷰포트보다 긴 패널은 아래가 잘려 「자세히 보기」에 닿을 수 없다. */}
        <div className="sm:sticky sm:top-[92px] sm:max-h-[calc(100vh-108px)] sm:overflow-y-auto">
          {/* 동작 아이콘 — 고정 범위의 첫 줄이다. 데스크탑 폭에서만 여기 있고, 좁은 폭에서는
              위쪽 줄이 대신한다(한 컬럼으로 쌓이면 이 자리가 한참 아래가 되기 때문). */}
          <div className="mb-3 hidden items-center justify-end gap-1 sm:flex">{actions}</div>

          {/* 🔴 판매 상태(#404) — 모바일은 제목 위 한 줄이 이 역할을 하는데 데스크탑에는 없었다.
              제안 패널 안 초록 도트가 대신하고 있었으나 그건 「AI 티」라 걷어냈고, 지우기만 하면
              데스크탑에서 상태가 통째로 사라진다. 모바일과 같은 자리·같은 문구로 맞춘다. */}
          <p className={`text-[11.5px] font-bold ${isLive || auction.status === "MATCHED" ? "text-ok" : "text-text-3"}`}>
            {isLive ? "판매 중" : auction.status === "MATCHED" ? "거래 성사 대기 중" : auction.status === "ENDED_SOLD" ? "거래 완료" : "판매 종료"}
          </p>

          {/* 좁은 오른쪽 열에서도 pill의 둥근 테두리가 열 밖으로 잘리지 않도록 컨테이너 안에서 정렬한다. */}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
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
          {/* 전자상거래법 §20 — 중개자 고지는 "가격 제안·구매 전"에 보여야 해서 결제 영역 바로 아래에 둔다.
              🔴 안전거래 안내를 여기로 합쳤다(#406). 예전에는 페이지 맨 아래에 전폭 회색 박스로 따로 있었는데,
              ① 제안 버튼에서 한참 떨어져 **누르기 전에 읽힐 자리가 아니었고** ② 한 페이지에 강조 패널은
              하나면 충분한데 우측 제안 패널과 둘이 경쟁했다. 두 문장이 같은 말(안전한 거래)을 하므로
              한 덩어리로 두고, 강조는 링크 하나에만 준다. */}
          <div className="mt-4 text-[11.5px] leading-relaxed text-text-3">
            <p>{INTERMEDIARY_NOTICE}</p>
            <p className="mt-2 font-bold text-text-2">안전한 거래를 위해 안내사항을 꼭 확인해주세요.</p>
            <Link
              href="/guide"
              className={`mt-1.5 inline-block rounded-r1 font-bold text-primary hover:underline ${FOCUS_RING}`}
            >
              자세히 보기 →
            </Link>
          </div>

          {/* 판매자 본인에게만(자체 게이팅) 발송 관리 패널 — 마이페이지 판매내역과 동일 발송 폼을 상세에서도 노출. */}
          {auction.status === "ENDED_SOLD" && <SellerShipPanel auctionId={auction.id} />}
        </div>
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
