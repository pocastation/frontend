"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuctionWishlistButton from "@/components/AuctionWishlistButton";
import DeliveryAddressGateModal from "@/components/DeliveryAddressGateModal";
import MobileDetailGallery from "@/components/mobile/MobileDetailGallery";
import { MobileDetailTabs, SellerRow } from "@/components/mobile/MobileDetailShared";
import OfferCounts from "@/components/OfferCounts";
import OfferWithdrawModal from "@/components/OfferWithdrawModal";
import SellerOfferPanel from "@/components/SellerOfferPanel";
import { useAuth } from "@/lib/auth-context";
import { useAuctionBidding } from "@/lib/auction-bidding-context";
import { OFFER_UNIT, buyerFee, estimatedTotal } from "@/lib/fees";
import { formatKRW } from "@/lib/format";
import { GRADE_LABEL, OFFER_EMPTY_HINT, SOURCE_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionDetailResponse } from "@/lib/types";

/**
 * 모바일 매물 상세.
 *
 * <p>가격 제안과 관련된 값은 전부 `AuctionBiddingProvider`에서 온다 — 데스크탑 `BidSection`과 **같은
 * 상태·같은 SSE 연결**을 읽는다(상세 하나에 EventSource가 둘 열리지 않게).
 *
 * <p>탭은 두 개(상품 정보 · 배송·환불)다. ⚠️ 예전에는 «제안 내역» 탭이 있었고 이미 제안한
 * 사람에게 그 탭이 먼저 열렸는데(「알고 싶은 건 지금 얼마까지 올라왔는지다」), §1.7로 그 내역이
 * 통째로 사라지면서 탭도 함께 없앴다.
 */


function formatInputAmount(amount: number): string {
  return amount.toLocaleString("ko-KR");
}

function parseInputAmount(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}

/** 제안 바텀시트 — 데스크톱과 같은 직접 입력·최소 금액·단위(OFFER_UNIT) 규칙을 사용한다. */
function BidSheet({ onClose }: { onClose: () => void }) {
  const { amount, floor, adjustAmount, submitting, myOfferAmount, needsAddress, handleBid } = useAuctionBidding();
  const [proposalValue, setProposalValue] = useState(() => formatInputAmount(amount));
  const [isEditing, setIsEditing] = useState(false);
  const typedAmount = parseInputAmount(proposalValue);
  const isBelowMinimum = typedAmount !== null && typedAmount < floor;
  const isNotUnit = typedAmount !== null && typedAmount % OFFER_UNIT !== 0;
  const hasValidAmount = typedAmount !== null && !isBelowMinimum && !isNotUnit;
  const total = estimatedTotal(amount);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 서버 상태가 바뀔 때 편집 중이 아닌 입력값만 동기화한다.
    if (!isEditing) setProposalValue(formatInputAmount(amount));
  }, [amount, isEditing]);

  function changeProposal(value: string) {
    const normalized = value.replace(/[^0-9]/g, "");
    setProposalValue(normalized ? Number(normalized).toLocaleString("ko-KR") : "");
    const next = parseInputAmount(normalized);
    if (next !== null && next >= floor && next % OFFER_UNIT === 0) adjustAmount(next);
  }

  function finishEditing() {
    setIsEditing(false);
    const next = parseInputAmount(proposalValue);
    const normalized = next === null ? floor : Math.max(floor, Math.floor(next / OFFER_UNIT) * OFFER_UNIT);
    adjustAmount(normalized);
    setProposalValue(formatInputAmount(normalized));
  }

  // 수정 모드(#480) — 이미 제안한 사람의 시트는 새 제안과 다르게 생겨야 한다. 헤더가
  // 「제안 금액 바꾸기」로 바뀌고 지금 제안 금액이 옆에 붙는다.
  const isEditMode = myOfferAmount != null;

  return (
    <div className="fixed inset-0 z-[500] sm:hidden" role="dialog" aria-label={isEditMode ? "제안 금액 바꾸기" : "가격 제안하기"} aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-text-1/40" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-r4 bg-white px-[14px] pb-[calc(16px_+_env(safe-area-inset-bottom))] pt-4">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <p className="text-[15px] font-extrabold text-text-1">{isEditMode ? "제안 금액 바꾸기" : "가격 제안하기"}</p>
          <p className="text-[11.5px] text-text-3">
            {isEditMode ? (
              <>지금 제안 <b className="font-display font-bold tabular-nums text-text-2">{formatKRW(myOfferAmount)}</b></>
            ) : (
              <>최소 <b className="font-display font-bold tabular-nums text-text-2">{formatKRW(floor)}</b></>
            )}
          </p>
        </div>

        <div className="mb-2.5 mt-3 flex items-baseline justify-between gap-3">
          <label htmlFor="mobile-proposal-amount" className="text-[13px] font-extrabold text-text-1">가격 제안</label>
          <span className={`text-[11px] ${isBelowMinimum || isNotUnit ? "font-semibold text-danger" : "text-text-3"}`}>
            {isBelowMinimum
              ? `${formatKRW(floor)} 이상 입력해주세요.`
              : isNotUnit
                ? `${OFFER_UNIT.toLocaleString("ko-KR")}원 단위로 입력해주세요.`
                : "최소 제안 금액 이상으로 입력해주세요"}
          </span>
        </div>

        <div className={`flex h-[52px] items-center overflow-hidden rounded-r2 border bg-white ${
          isBelowMinimum || isNotUnit ? "border-danger" : "border-border focus-within:border-primary"
        }`}>
          <span className="flex h-full w-[52px] items-center justify-center border-r border-border font-display text-lg font-bold">₩</span>
          <input
            id="mobile-proposal-amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={proposalValue}
            aria-invalid={isBelowMinimum || isNotUnit}
            onFocus={() => setIsEditing(true)}
            onChange={(event) => changeProposal(event.target.value)}
            onBlur={finishEditing}
            placeholder="금액을 입력해주세요"
            className={`h-full min-w-0 flex-1 bg-transparent px-4 font-display text-lg font-bold tabular-nums outline-none placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:text-text-3 ${FOCUS_RING}`}
          />
        </div>

        <div className="mt-3.5 rounded-r2 bg-surface-2 p-3 text-[12.5px]">
          <div className="flex items-center justify-between py-0.5 text-text-3">
            <span>가격 제안</span>
            <span className="font-medium tabular-nums text-text-2">{formatKRW(amount)}</span>
          </div>
          <div className="flex items-center justify-between py-0.5 text-text-3">
            <span>구매자 수수료</span>
            <span className="font-medium tabular-nums text-text-2">{formatKRW(buyerFee(amount))}</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between border-t border-border pt-2">
            <span className="font-bold text-text-1">예상 결제 총액</span>
            <span className="font-display text-base font-bold tabular-nums text-text-1">{formatKRW(total)}</span>
          </div>
          <p className="mt-1.5 text-[11px] text-text-3">거래 성사 시 예상 금액이며 실제 청구액과 다를 수 있습니다.</p>
        </div>

        {/* 🔴 제안 뒤에도 잠그지 않는다(#428) — 다시 제안하는 것이 곧 수정이다(§2.1).
            예전에는 잠겨 있어 금액을 바꿀 방법이 아예 없었다.

            제안이 끝나면 시트를 닫는다(#453) — 열어 두면 「보내졌나?」가 남는다(토스트는 시트에
            가려 안 보였다). 배송지 게이트로 빠질 때도 닫는다: 게이트 모달(z-400)이 시트(z-500)
            **뒤에** 깔려, 안 닫으면 시트 뒤로 등록 화면이 비치는 겹침이 그대로 재현된다.
            저장이 끝나면 onAddressSaved가 시트를 다시 열어 흐름을 잇는다. 실패("failed")에만
            시트를 유지한다 — 금액을 고쳐 재시도할 자리다. */}
        <button
          type="button"
          onClick={() => {
            void handleBid().then((result) => {
              if (result !== "failed") onClose();
            });
          }}
          disabled={submitting || !hasValidAmount}
          className={`mt-3 flex h-12 w-full items-center justify-center rounded-[7px] bg-primary text-sm font-extrabold text-white disabled:opacity-60 ${FOCUS_RING}`}
        >
          {/* 제출 버튼이 입력 금액을 그대로 말한다(#480) — 「무엇이 일어나는지」가 버튼에 있다. */}
          {submitting
            ? "처리 중..."
            : needsAddress
              ? "배송지 등록하고 가격 제안하기"
              : !hasValidAmount
                ? isEditMode ? "제안 금액 바꾸기" : "가격 제안하기"
                : isEditMode
                  ? `${formatKRW(typedAmount)}으로 바꾸기`
                  : `${formatKRW(typedAmount)}으로 제안하기`}
        </button>
        {needsAddress && (
          <p className="mt-2 text-[11.5px] leading-[1.6] text-text-3">
            거래가 성사되면 바로 보내드릴 수 있게 받을 주소를 먼저 등록해요.{" "}
            <b className="font-bold text-text-2">한 번만 하면 다음부터는 물어보지 않아요.</b>
          </p>
        )}
        {isEditMode && (
          <p className="mt-3 border-t border-border pt-2.5 text-[11.5px] leading-[1.6] text-text-3">
            새 금액으로 보내면 이전 제안을 대신해요. 판매자에게는 바뀐 금액만 보여요.
          </p>
        )}
      </div>
    </div>
  );
}

export default function MobileAuctionDetail({
  auction,
  actions,
}: {
  auction: AuctionDetailResponse;
  actions?: React.ReactNode;
}) {
  const { accessToken } = useAuth();
  const {
    auctionId,
    offerCount,
    wishlistCount,
    status,
    isLive,
    isOwnAuction,
    myOffer,
    onOfferWithdrawn,
    addressModalOpen,
    closeAddressModal,
    onAddressSaved,
  } = useAuctionBidding();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  // 🔴 예전에는 「제안 내역」 탭이 있었고, 이미 제안한 사람에게는 그 탭이 먼저 열렸다

  const specRows: { label: string; value: string }[] = [
    { label: "그룹", value: auction.artistName ?? "-" },
    ...(auction.idolName ? [{ label: "멤버", value: auction.idolName }] : []),
    ...(auction.albumName ? [{ label: "앨범", value: auction.albumName }] : []),
    { label: "출처", value: SOURCE_LABEL[auction.source] ?? auction.source },
    { label: "상태 등급", value: GRADE_LABEL[auction.grade] ?? auction.grade },
    { label: "미개봉", value: auction.unopened ? "예" : "아니오" },
  ];

  return (
    /* 하단 바가 모든 상태에서 상시 노출되므로(#478) 바 높이 여백도 항상 깐다. */
    <div className="pb-[108px]">
      <MobileDetailGallery images={auction.images} video={auction.video} title={auction.title} actions={actions} />

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className={`text-[11.5px] font-bold ${isLive || status === "MATCHED" ? "text-ok" : "text-text-3"}`}>
            {isLive ? "판매 중" : status === "MATCHED" ? "거래 성사 대기 중" : status === "ENDED_SOLD" ? "거래 완료" : "판매 종료"}
          </span>
          {/* 스타 이름을 누르면 그 스타의 페이지로 간다 — 같은 스타 매물을 이어 보는 가장 짧은 길이다. */}
          {auction.artistName && (
            <Link
              href={`/artists/${auction.artistId}`}
              className={`min-w-0 truncate text-[11.5px] font-extrabold text-text-2 ${FOCUS_RING}`}
            >
              {auction.artistName}
            </Link>
          )}
        </div>

        <h1 className="mt-2 text-[19px] font-extrabold leading-[1.4] tracking-[-0.01em] text-text-1">
          {auction.title}
        </h1>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-chip border border-border-2 px-2 py-[3px] text-[11px] font-extrabold text-text-2">
            {GRADE_LABEL[auction.grade] ?? auction.grade}
          </span>
          <span className="rounded-chip border border-border-2 px-2 py-[3px] text-[11px] font-extrabold text-text-2">
            {SOURCE_LABEL[auction.source] ?? auction.source}
          </span>
          {auction.unopened && (
            <span className="rounded-chip border border-border-2 px-2 py-[3px] text-[11px] font-extrabold text-text-2">
              미개봉
            </span>
          )}
        </div>

        {/* 가격 패널 — 참여 수 → 금액 → 안내 세 층.
            🔴 판매 상태를 여기서 말하지 않는다(#404). 초록 도트가 있던 자리인데, 바로 위 제목
            머리줄이 이미 「판매 중」을 말하고 있어 **한 화면에 같은 말이 두 번** 나왔다. */}
        {isOwnAuction && (status === "LIVE" || status === "MATCHED") ? (
          <div className="mt-4">
            <SellerOfferPanel
              startPrice={auction.startPrice}
              offerCount={offerCount}
              wishlistCount={wishlistCount}
              status={status}
              viewport="mobile"
            />
          </div>
        ) : (
          <div className="mt-4 rounded-r3 border border-border p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold text-text-3">판매자 최소 제안 금액</p>
              <span aria-live="polite">
                <OfferCounts offerCount={offerCount} wishlistCount={wishlistCount} />
              </span>
            </div>
            <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-text-1">
              {formatKRW(auction.startPrice)}
            </p>
            {/* 내 제안 행(#480) — 제안한 사람에게만. 보라는 상태를 말하는 자리에 쓴다(디자인 절). */}
            {myOffer && (
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[12.5px]">
                <span className="font-extrabold text-primary">
                  {myOffer.status === "ACCEPTED" ? "내 제안 · 선택됨" : "내 제안"}
                </span>
                <span className="font-display font-extrabold tabular-nums text-text-1">
                  {formatKRW(myOffer.amount)}
                </span>
              </div>
            )}
            {/* 0건일 때만 — 아이콘 줄에서 뺀 자리를 여기서 채운다(§2.9 D1). */}
            {offerCount === 0 && (
              <p className="mt-3 border-t border-border pt-2.5 text-[11.5px] font-bold text-text-2">
                {OFFER_EMPTY_HINT}
              </p>
            )}
            {/* 구매자가 처음 보는 메커니즘이라 「왜 최고가가 안 보이지」에 여기서 답한다.
                마감을 표시하지 않기로 하면서 더 중요해졌다. */}
            <p
              className={`text-[10.5px] leading-relaxed text-text-3 ${
                offerCount === 0 ? "mt-1.5" : "mt-3 border-t border-border pt-2.5"
              }`}
            >
              판매자가 제안을 보고 거래 상대를 직접 선택해요. 다른 사람의 제안 금액은 공개되지 않아요.
            </p>
          </div>
        )}

        <SellerRow sellerId={auction.sellerId} nickname={auction.sellerNickname} />

        <MobileDetailTabs description={auction.description} specRows={specRows} />
      </div>

      {/* 하단 고정 바 — 킷과 같은 구성: 관심 44×44 + 제안 CTA(남은 폭 전부).
          최소가·마감은 위 가격 패널과 제안 시트가 말하므로 바에서는 반복하지 않는다.

          🔴 모든 상태에서 유지한다(#478, 시안 승인). LIVE에만 그리던 시절엔 성사 대기·완료
          매물에서 바가 통째로 사라져 관심(찜)을 누를 방법이 없었다. 관심은 언제나 살리고,
          제안 CTA만 상태 문구로 잠근다 — 왜 제안이 안 되는지도 그 자리에서 설명된다. */}
      <div
        className="fixed inset-x-0 bottom-0 z-[400] flex items-center gap-2.5 border-t border-border bg-white px-4 pt-2.5 sm:hidden"
        style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
      >
        <AuctionWishlistButton
          auctionId={auctionId}
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[7px] border border-border-2 bg-white text-text-2 ${FOCUS_RING}`}
        />
        {isOwnAuction && (isLive || status === "MATCHED") ? (
          <a
            href="#seller-offer-list-mobile"
            className={`flex h-11 flex-1 items-center justify-center rounded-[7px] bg-primary text-[13.5px] font-extrabold text-white ${FOCUS_RING}`}
          >
            제안 목록 보기
          </a>
        ) : status === "MATCHED" && myOffer?.status === "ACCEPTED" ? (
          /*
            🔴 이 분기가 `!isLive`보다 **앞에 있어야 한다**(#507). 제안이 선택되면 매물은 MATCHED가
            되는데, 예전에는 그 순간 아래 비활성 버튼이 먼저 걸려 선택된 구매자에게
            「거래 진행 중인 매물이에요」를 보여줬다 — **자기가 결제해야 하는 사람인데** 남의 거래를
            구경하는 것처럼 안내한 것이다.

            MATCHED로 한정하는 이유: 결제가 끝나면 매물이 ENDED_SOLD로 가므로 그때는 아래
            「판매 완료된 매물이에요」가 맞다.
          */
          <Link
            href={`/orders/${auctionId}/payment`}
            className={`flex h-11 flex-1 items-center justify-center rounded-[7px] bg-primary text-[13.5px] font-extrabold text-white ${FOCUS_RING}`}
          >
            결제하러 가기
          </Link>
        ) : !isLive ? (
          <button
            type="button"
            disabled
            className="flex h-11 flex-1 items-center justify-center rounded-[7px] bg-surface-2 text-[13.5px] font-extrabold text-text-3"
          >
            {status === "MATCHED"
              ? "거래 진행 중인 매물이에요"
              : status === "ENDED_SOLD"
                ? "판매 완료된 매물이에요"
                : "판매가 종료된 매물이에요"}
          </button>
        ) : !accessToken ? (
          <Link
            href={`/login?redirect=/auctions/${auctionId}`}
            className={`flex h-11 flex-1 items-center justify-center rounded-[7px] bg-primary text-[13.5px] font-extrabold text-white ${FOCUS_RING}`}
          >
            로그인하고 제안하기
          </Link>
        ) : myOffer ? (
          /* 비대칭 2버튼(#480, 시안 승인) — 취소는 좁은 보조, 바꾸기가 주(아웃라인).
             반반이면 파괴적 행동에 주연급 무게가 실리고 엄지 존 오탭이 늘어난다. */
          <>
            <button
              type="button"
              onClick={() => setWithdrawOpen(true)}
              className={`flex h-11 w-[96px] flex-shrink-0 items-center justify-center rounded-[7px] border border-border-2 bg-white text-[13px] font-bold text-text-2 ${FOCUS_RING}`}
            >
              취소하기
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className={`flex h-11 flex-1 items-center justify-center rounded-[7px] border-[1.5px] border-text-1 bg-white text-[13.5px] font-extrabold text-text-1 ${FOCUS_RING}`}
            >
              금액 바꾸기
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`flex h-11 flex-1 items-center justify-center rounded-[7px] bg-primary text-[13.5px] font-extrabold text-white ${FOCUS_RING}`}
          >
            제안하기
          </button>
        )}
      </div>

      {/* 제안 취소(#480) — 마이페이지와 같은 확인 모달 재사용. 되돌릴 수 없음·재제안 가능 안내 포함. */}
      {withdrawOpen && myOffer && (
        <OfferWithdrawModal
          auctionId={auctionId}
          bidId={myOffer.bidId}
          title={auction.title}
          onClose={() => setWithdrawOpen(false)}
          onWithdrawn={() => {
            setWithdrawOpen(false);
            onOfferWithdrawn();
          }}
        />
      )}

      {sheetOpen && <BidSheet onClose={() => setSheetOpen(false)} />}

      {/* 배송지 등록(#283) — 저장해도 제안을 대신 눌러주지 않는다. 가격 제안은 취소할 수 없는 청약이라
          사용자가 한 번 더 눌러야 한다(약관 §13조의2 ②). 대신 시트를 열어 흐름을 이어 준다. */}
      {addressModalOpen && (
        <DeliveryAddressGateModal
          action="가격 제안"
          onClose={closeAddressModal}
          onSaved={() => onAddressSaved(() => setSheetOpen(true))}
        />
      )}
    </div>
  );
}
