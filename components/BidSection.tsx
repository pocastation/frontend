"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DeliveryAddressGateModal from "@/components/DeliveryAddressGateModal";
import { useAuth } from "@/lib/auth-context";
import { useAuctionBidding } from "@/lib/auction-bidding-context";
import { formatKRW } from "@/lib/format";
import { OFFER_UNIT, buyerFee, estimatedTotal } from "@/lib/fees";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS } from "@/lib/ui";

type Props = {
  startPrice: number;
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

// 데스크톱 상세의 가격 제안 영역. 경매의 진행 정보 대신 판매자가 정한 최소 금액과
// 구매자의 직접 입력만 전면에 둔다. 제안 API·배송지 관문은 기존 계약을 그대로 사용한다.
export default function BidSection({ startPrice }: Props) {
  const { accessToken } = useAuth();
  const {
    auctionId,
    offerCount,
    wishlistCount,
    status,
    isLive,
    isOwnAuction,
    amount,
    adjustAmount,
    submitting,
    alreadyOffered,
    handleBid,
    needsAddress,
    addressModalOpen,
    closeAddressModal,
    onAddressSaved,
  } = useAuctionBidding();
  const [proposalValue, setProposalValue] = useState(() => formatInputAmount(amount));
  const [isEditing, setIsEditing] = useState(false);

  const minimumProposalAmount = startPrice;
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

  const submitDisabled = submitting || alreadyOffered || !hasValidAmount;

  return (
    <div className="mt-6">
      <section className="rounded-r3 border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-6">
          <span
            className={`inline-flex items-center gap-2 text-sm font-bold ${isLive ? "text-ok" : "text-text-3"}`}
          >
            <span className={`h-2 w-2 rounded-full ${isLive ? "bg-ok" : "bg-text-3"}`} aria-hidden="true" />
            {isLive ? "판매 중" : status === "ENDED_SOLD" ? "거래 성사" : "판매 종료"}
          </span>
          <dl className="flex shrink-0 divide-x divide-border text-right">
            <div className="pr-4">
              <dt className="text-[11px] font-semibold text-text-3">가격 제안</dt>
              <dd className="mt-0.5 font-display text-xl font-extrabold tabular-nums text-text-1">{offerCount}회</dd>
            </div>
            <div className="pl-4">
              <dt className="text-[11px] font-semibold text-text-3">관심</dt>
              <dd className="mt-0.5 font-display text-xl font-extrabold tabular-nums text-text-1">{wishlistCount}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-7">
          <p className="text-xs font-semibold text-text-3">판매자 최소 제안 금액</p>
          <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-text-1">
            {formatKRW(minimumProposalAmount)}
          </p>
        </div>

        {isLive &&
          (isOwnAuction ? (
            <p className="mt-6 border-t border-border pt-5 text-center text-sm font-semibold text-text-2">
              내 매물입니다. 직접 가격을 제안할 수 없어요.
            </p>
          ) : !accessToken ? (
            <Link
              href={`/login?redirect=/auctions/${auctionId}`}
              className={`mt-6 flex h-12 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
            >
              로그인하고 가격 제안하기
            </Link>
          ) : (
            <div className="mt-6 border-t border-border pt-5">
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
                onClick={() => void handleBid()}
                disabled={submitDisabled}
                className={`mt-4 flex h-12 w-full items-center justify-center rounded-r2 bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary ${FOCUS_RING}`}
              >
                {alreadyOffered
                  ? "가격 제안을 보냈어요"
                  : submitting
                    ? "처리 중..."
                    : needsAddress
                      ? "배송지 등록하고 가격 제안하기"
                      : "가격 제안하기"}
              </button>
              {needsAddress && (
                <p className="mt-2 text-[11.5px] leading-[1.6] text-text-3">
                  거래가 성사되면 바로 보내드릴 수 있게 받을 주소를 먼저 등록해요. {" "}
                  <b className="font-bold text-text-2">한 번만 하면 다음부터는 물어보지 않아요.</b>
                </p>
              )}
            </div>
          ))}
      </section>

      {addressModalOpen && (
        <DeliveryAddressGateModal action="가격 제안" onClose={closeAddressModal} onSaved={onAddressSaved} />
      )}
    </div>
  );
}
