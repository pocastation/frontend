"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import DeliveryAddressGateModal from "@/components/DeliveryAddressGateModal";
import OfferCounts from "@/components/OfferCounts";
import OfferWithdrawModal from "@/components/OfferWithdrawModal";
import SellerOfferPanel from "@/components/SellerOfferPanel";
import { useAuth } from "@/lib/auth-context";
import { useAuctionBidding } from "@/lib/auction-bidding-context";
import { formatKRW } from "@/lib/format";
import { OFFER_UNIT, buyerFee, estimatedTotal } from "@/lib/fees";
import { OFFER_EMPTY_HINT } from "@/lib/labels";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS } from "@/lib/ui";

type Props = {
  startPrice: number;
  auctionTitle: string;
};

function formatInputAmount(amount: number): string {
  return amount.toLocaleString("ko-KR");
}

function parseInputAmount(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}

/**
 * 제안 입력 폼 — 미제안 상태의 인라인과 수정 팝업이 같은 골격을 쓴다(#484).
 * 라벨·제출 문구만 모드에 따라 갈리고, 입력·단위 검증·수수료 계산은 하나다.
 */
function OfferForm({
  minimumProposalAmount,
  editMode,
  onDone,
}: {
  minimumProposalAmount: number;
  /** true면 「제안 금액 바꾸기」 — 팝업에서 쓴다. */
  editMode: boolean;
  /** 제안이 끝났을 때(성공·게이트 이탈) 팝업이 닫히도록. 인라인은 안 넘긴다. */
  onDone?: () => void;
}) {
  const { amount, adjustAmount, submitting, handleBid, needsAddress } = useAuctionBidding();
  const [proposalValue, setProposalValue] = useState(() => formatInputAmount(amount));
  const [isEditing, setIsEditing] = useState(false);

  const typedAmount = parseInputAmount(proposalValue);
  const isBelowMinimum = typedAmount !== null && typedAmount < minimumProposalAmount;
  const isNotUnit = typedAmount !== null && typedAmount % OFFER_UNIT !== 0;
  const hasValidAmount = typedAmount !== null && !isBelowMinimum && !isNotUnit;
  const total = useMemo(() => estimatedTotal(amount), [amount]);

  // 서버 이벤트나 제안 완료로 값이 바뀌면, 사용자가 입력 중이 아닐 때만 입력칸을 동기화한다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 서버 상태가 바뀔 때 편집 중이 아닌 입력값만 동기화한다.
    if (!isEditing) setProposalValue(formatInputAmount(amount));
  }, [amount, isEditing]);

  function changeProposal(value: string) {
    const normalized = value.replace(/[^0-9]/g, "");
    setProposalValue(normalized ? Number(normalized).toLocaleString("ko-KR") : "");
    const next = parseInputAmount(normalized);
    if (next !== null && next >= minimumProposalAmount && next % OFFER_UNIT === 0) {
      adjustAmount(next);
    }
  }

  function finishEditing() {
    setIsEditing(false);
    const next = parseInputAmount(proposalValue);
    const normalized =
      next === null
        ? minimumProposalAmount
        : Math.max(minimumProposalAmount, Math.floor(next / OFFER_UNIT) * OFFER_UNIT);
    adjustAmount(normalized);
    setProposalValue(formatInputAmount(normalized));
  }

  // 🔴 제안한 뒤에도 버튼을 잠그지 않는다(#428). 다시 제안하는 것이 곧 수정이라(§1.2·§2.1)
  // 막을 이유가 없다 — 예전에는 잠겨 있어 금액을 바꿀 방법이 아예 없었다.
  const submitDisabled = submitting || !hasValidAmount;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="proposal-amount" className="text-[13px] font-bold text-text-1">
          가격 제안
        </label>
        <span
          id="proposal-amount-help"
          className={`text-[11px] ${isBelowMinimum || isNotUnit ? "font-semibold text-danger" : "text-text-3"}`}
        >
          {isBelowMinimum
            ? `${formatKRW(minimumProposalAmount)} 이상 입력해주세요.`
            : isNotUnit
              ? `${OFFER_UNIT.toLocaleString("ko-KR")}원 단위로 입력해주세요.`
              : "최소 제안 금액 이상으로 입력해주세요"}
        </span>
      </div>
      <div
        className={`mt-2 flex h-12 items-center overflow-hidden rounded-r2 border bg-surface transition-colors ${
          isBelowMinimum || isNotUnit ? "border-danger" : "border-border focus-within:border-primary"
        }`}
      >
        <span className="flex h-full w-12 shrink-0 items-center justify-center border-r border-border font-display text-lg font-bold text-text-1">
          ₩
        </span>
        <input
          id="proposal-amount"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-describedby="proposal-amount-help"
          aria-invalid={isBelowMinimum || isNotUnit}
          value={proposalValue}
          onFocus={() => setIsEditing(true)}
          onChange={(event) => changeProposal(event.target.value)}
          onBlur={finishEditing}
          className={`h-full min-w-0 flex-1 bg-transparent px-4 font-display text-lg font-bold tabular-nums text-text-1 outline-none placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:text-text-3 ${FOCUS_RING}`}
          placeholder="금액을 입력해주세요"
        />
      </div>
      <div className="mt-5 bg-surface-2 px-4 py-3.5 text-[13px]">
        <div className="flex items-center justify-between text-text-3">
          <span>가격 제안</span>
          <span className="font-medium tabular-nums text-text-2">{formatKRW(amount)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-text-3">
          <span>구매자 수수료</span>
          <span className="font-medium tabular-nums text-text-2">{formatKRW(buyerFee(amount))}</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="font-bold text-text-1">예상 결제 총액</span>
          <span className="font-display text-lg font-bold tabular-nums text-text-1">{formatKRW(total)}</span>
        </div>
        <p className="mt-1.5 text-[11px] text-text-3">거래 성사 시 예상 금액이며 실제 청구액과 다를 수 있습니다.</p>
      </div>

      <button
        type="button"
        onClick={() => {
          void handleBid().then((result) => {
            if (result !== "failed") onDone?.();
          });
        }}
        disabled={submitDisabled}
        className={`mt-4 flex h-12 w-full items-center justify-center rounded-r2 bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary ${FOCUS_RING}`}
      >
        {/* 제출 버튼이 입력 금액을 그대로 말한다(#480·#484) — 「무엇이 일어나는지」가 버튼에 있다. */}
        {submitting
          ? "처리 중..."
          : needsAddress
            ? "배송지 등록하고 가격 제안하기"
            : !hasValidAmount
              ? editMode ? "제안 금액 바꾸기" : "가격 제안하기"
              : editMode
                ? `${formatKRW(typedAmount)}으로 바꾸기`
                : `${formatKRW(typedAmount)}으로 제안하기`}
      </button>
      {editMode && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-text-3">
          새 금액으로 보내면 이전 제안을 대신해요. 판매자에게는 바뀐 금액만 보여요.
        </p>
      )}
      {needsAddress && (
        <p className="mt-2 text-[11.5px] leading-[1.6] text-text-3">
          거래가 성사되면 바로 보내드릴 수 있게 받을 주소를 먼저 등록해요.{" "}
          <b className="font-bold text-text-2">한 번만 하면 다음부터는 물어보지 않아요.</b>
        </p>
      )}
    </div>
  );
}

// 데스크톱 상세의 가격 제안 영역. 경매의 진행 정보 대신 판매자가 정한 최소 금액과
// 구매자의 직접 입력만 전면에 둔다. 제안 API·배송지 관문은 기존 계약을 그대로 사용한다.
//
// 🔴 제안함 상태에서는 폼을 치운다(#484, 시안 04 팝업안). 입력 폼이 항상 열려 있는 것
// 자체가 「수정이 새 제안과 똑같다」는 혼란의 뿌리였다 — 요약(내 제안 행)과
// [취소하기 | 금액 바꾸기]만 남기고, 폼은 팝업으로 연다(모바일 시트의 데스크탑 번역).
// 미제안 상태의 인라인 폼은 그대로다: 첫 제안의 문턱은 낮게.
export default function BidSection({ startPrice, auctionTitle }: Props) {
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
  const [editOpen, setEditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const minimumProposalAmount = startPrice;

  if (isOwnAuction && (status === "LIVE" || status === "MATCHED")) {
    return (
      <div className="mt-6">
        <SellerOfferPanel
          startPrice={startPrice}
          offerCount={offerCount}
          wishlistCount={wishlistCount}
          status={status}
          viewport="desktop"
        />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <section className="rounded-r3 border border-border bg-surface p-5">
        {/* 🔴 판매 상태를 여기서 말하지 않는다. 초록 도트가 있던 자리인데, 상태는 제목 위 한 줄이
            전담한다(`app/auctions/[id]/page.tsx`) — 두 곳에서 말하면 「판매 중」이 두 번 나온다. */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold text-text-3">판매자 최소 제안 금액</p>
          <OfferCounts offerCount={offerCount} wishlistCount={wishlistCount} size="md" />
        </div>
        <p className="mt-1.5 font-display text-3xl font-extrabold tabular-nums text-text-1">
          {formatKRW(minimumProposalAmount)}
        </p>
        {/* 내 제안 행(#484) — 제안한 사람에게만. 보라는 상태를 말하는 자리에 쓴다(디자인 절). */}
        {myOffer && (
          <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3 text-[13px]">
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
          <p className="mt-3.5 border-t border-border pt-3 text-[12.5px] font-bold text-text-2">
            {OFFER_EMPTY_HINT}
          </p>
        )}
        {/* 구매자가 처음 보는 메커니즘이라 「왜 최고가가 안 보이지」에 여기서 답한다. */}
        <p
          className={`text-[11px] leading-relaxed text-text-3 ${
            offerCount === 0 ? "mt-1.5" : "mt-3.5 border-t border-border pt-3"
          }`}
        >
          판매자가 제안을 보고 거래 상대를 직접 선택해요. 다른 사람의 제안 금액은 공개되지 않아요.
          {myOffer?.status === "ACTIVE" && " 금액은 언제든 바꿀 수 있어요."}
        </p>

        {/*
          🔴 결제 안내는 **isLive 밖에 있어야 한다**(#507). 제안이 선택되면 매물은 MATCHED가 되어
          isLive가 false다 — 예전에는 이 버튼이 isLive 가드 안에 있어서, 정작 결제해야 하는 사람에게
          영영 렌더되지 않았다. 알림 → 상세로 온 구매자가 결제로 가는 길이 이 버튼 하나뿐인데
          그게 막혀 있었다.

          MATCHED로 한정하는 이유: 결제가 끝나면 OrderPaidEvent가 매물을 ENDED_SOLD로 보낸다.
          myOffer.status만 보면 결제 완료 뒤에도 「결제하러 가기」가 남는다.
        */}
        {status === "MATCHED" && myOffer?.status === "ACCEPTED" ? (
          /* 내 제안이 선택됨 — 계약 성립(§1.9), 수정·취소가 아니라 결제로 이어진다. */
          <Link
            href={`/orders/${auctionId}/payment`}
            className={`mt-6 flex h-12 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
          >
            결제하러 가기
          </Link>
        ) : (
          isLive &&
          (!accessToken ? (
            <Link
              href={`/login?redirect=/auctions/${auctionId}`}
              className={`mt-6 flex h-12 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
            >
              로그인하고 가격 제안하기
            </Link>
          ) : myOffer ? (
            /* 비대칭 2버튼 — 모바일 바(#480)와 같은 어휘. 「금액 바꾸기」는 아웃라인 주,
               취소는 좁은 보조. 폼은 팝업이 연다. */
            <div className="mt-6 flex gap-2 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setWithdrawOpen(true)}
                className={`flex h-12 w-[96px] flex-shrink-0 items-center justify-center rounded-r2 border border-border-2 bg-surface text-[13px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 ${FOCUS_RING}`}
              >
                취소하기
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className={`flex h-12 flex-1 items-center justify-center rounded-r2 border-[1.5px] border-text-1 bg-surface text-sm font-extrabold text-text-1 transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
              >
                금액 바꾸기
              </button>
            </div>
          ) : (
            <div className="mt-6 border-t border-border pt-5">
              <OfferForm minimumProposalAmount={minimumProposalAmount} editMode={false} />
            </div>
          ))
        )}
      </section>

      {/* 금액 바꾸기 팝업(#484) — 모바일 시트와 같은 골격. 게이트로 빠질 때도 닫는다
          (게이트 모달 z-400이 이 팝업 뒤에 깔리지 않도록). 실패에만 유지해 재시도 자리를 남긴다.
          body portal(#486) — 조상 스택 컨텍스트에 갇히면 갤러리 화살표·카운터(z-10)가 위에
          그려진다(SellerOfferPanel 전례). */}
      {editOpen && myOffer && createPortal(
        <div className="fixed inset-0 z-[500] hidden items-center justify-center p-4 sm:flex" role="dialog" aria-label="제안 금액 바꾸기" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setEditOpen(false)} className="absolute inset-0 bg-text-1/40" />
          <div className="relative max-h-[90vh] w-full max-w-[400px] overflow-y-auto rounded-r4 bg-surface p-5 shadow-modal">
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-extrabold text-text-1">제안 금액 바꾸기</p>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setEditOpen(false)}
                className={`text-text-3 transition-colors hover:text-text-1 ${FOCUS_RING}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-[11.5px] text-text-3">
              지금 제안{" "}
              <b className="font-display font-bold tabular-nums text-text-2">{formatKRW(myOffer.amount)}</b>
            </p>
            <div className="mt-4">
              <OfferForm
                minimumProposalAmount={minimumProposalAmount}
                editMode
                onDone={() => setEditOpen(false)}
              />
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* 제안 취소(#484) — 마이페이지·모바일과 같은 확인 모달 재사용. */}
      {withdrawOpen && myOffer && (
        <OfferWithdrawModal
          auctionId={auctionId}
          bidId={myOffer.bidId}
          title={auctionTitle}
          onClose={() => setWithdrawOpen(false)}
          onWithdrawn={() => {
            setWithdrawOpen(false);
            onOfferWithdrawn();
          }}
        />
      )}

      {addressModalOpen && (
        <DeliveryAddressGateModal action="가격 제안" onClose={closeAddressModal} onSaved={onAddressSaved} />
      )}
    </div>
  );
}
