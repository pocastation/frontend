"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuctionWishlistButton from "@/components/AuctionWishlistButton";
import DeliveryAddressGateModal from "@/components/DeliveryAddressGateModal";
import MobileDetailGallery from "@/components/mobile/MobileDetailGallery";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAuctionBidding } from "@/lib/auction-bidding-context";
import { BID_MIN_INCREMENT, buyerFee, estimatedTotal } from "@/lib/fees";
import { formatKRW } from "@/lib/format";
import { INTERMEDIARY_NOTICE } from "@/lib/business";
import { GRADE_LABEL, SOURCE_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionDetailResponse, SellerRatingResponse } from "@/lib/types";

/**
 * 모바일 매물 상세.
 *
 * <p>가격 제안과 관련된 값은 전부 `AuctionBiddingProvider`에서 온다 — 데스크탑 `BidSection`과 **같은
 * 상태·같은 SSE 연결**을 읽는다(상세 하나에 EventSource가 둘 열리지 않게).
 *
 * <p>탭은 상품 정보와 배송·환불 안내 두 개다. 가격 제안 내역은 구매자 화면에 노출하지 않는다.
 */

const TAB_PRODUCT = "상품 정보";
const TAB_DELIVERY = "배송·환불";

function formatInputAmount(amount: number): string {
  return amount.toLocaleString("ko-KR");
}

function parseInputAmount(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}

// BE가 내려주는 등급 라벨에는 이모지가 붙어 온다("덕린이 🌱"). 제품 화면은 이모지를 쓰지 않으므로
// 글자만 남긴다 — 등급 이름 자체는 BE 값을 그대로 쓴다(우리가 새로 짓지 않는다).
function plainLevelLabel(label: string): string {
  return label.replace(/[\p{Extended_Pictographic}️]/gu, "").trim();
}

function SellerRow({ sellerId, nickname }: { sellerId: string; nickname: string }) {
  const [levelLabel, setLevelLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<SellerRatingResponse>(`/api/sellers/${sellerId}/rating`, { cache: "no-store" });
        if (!cancelled) setLevelLabel(plainLevelLabel(res.trustLevelLabel));
      } catch {
        // 등급을 못 받으면 줄 자체를 비운다 — 틀린 등급을 보여주느니 안 보여준다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  return (
    <Link
      href={`/sellers/${sellerId}`}
      className={`mt-3.5 flex items-center gap-2.5 rounded-r3 border border-border p-3 ${FOCUS_RING}`}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-extrabold text-primary">
        {nickname.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-extrabold text-text-1">{nickname}</span>
        {levelLabel && <span className="mt-0.5 block text-[11.5px] text-text-3">{levelLabel}</span>}
      </span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-3" aria-hidden="true">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

/** 제안 바텀시트 — 데스크탑과 같은 직접 입력·최소 금액·예상 결제 규칙을 사용한다. */
function BidSheet({ onClose, minimumPrice }: { onClose: () => void; minimumPrice: number }) {
  const {
    amount, adjustAmount, submitting, isTopBidder, needsAddress, handleBid,
  } = useAuctionBidding();
  const minimumProposalAmount = minimumPrice;
  const [proposalValue, setProposalValue] = useState(() => formatInputAmount(amount));
  const [isEditing, setIsEditing] = useState(false);
  const typedAmount = parseInputAmount(proposalValue);
  const isBelowMinimum = typedAmount !== null && typedAmount < minimumProposalAmount;
  const isNotUnit = typedAmount !== null && typedAmount % BID_MIN_INCREMENT !== 0;
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
    if (next !== null && next >= minimumProposalAmount && next % BID_MIN_INCREMENT === 0) {
      // 직접 입력은 스테퍼를 거치지 않고도 같은 컨텍스트 금액을 갱신한다.
      adjustAmount(next);
    }
  }

  function finishEditing() {
    setIsEditing(false);
    const next = parseInputAmount(proposalValue);
    const normalized =
      next === null
        ? minimumProposalAmount
        : Math.max(minimumProposalAmount, Math.floor(next / BID_MIN_INCREMENT) * BID_MIN_INCREMENT);
    adjustAmount(normalized);
    setProposalValue(formatInputAmount(normalized));
  }

  const submitDisabled = submitting || isTopBidder || !hasValidAmount;

  return (
    <div className="fixed inset-0 z-[500] sm:hidden" role="dialog" aria-label="가격 제안하기" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-text-1/40" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-r4 bg-white px-[14px] pb-[calc(16px_+_env(safe-area-inset-bottom))] pt-4">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <span className="inline-flex items-center gap-2 text-[13px] font-bold text-ok">
            <span className="h-2 w-2 rounded-full bg-ok" aria-hidden="true" />
            판매 중
          </span>
        </div>

        <div className="mt-3">
          <p className="text-[12px] font-semibold text-text-3">판매자 최소 제안 금액</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums text-text-1">{formatKRW(minimumProposalAmount)}</p>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="mobile-proposal-amount" className="text-[13px] font-extrabold text-text-1">
              가격 제안
            </label>
            <span
              id="mobile-proposal-amount-help"
              className={`text-[11px] ${isBelowMinimum || isNotUnit ? "font-semibold text-danger" : "text-text-3"}`}
            >
              {isBelowMinimum
                ? `${formatKRW(minimumProposalAmount)} 이상 입력해주세요.`
                : isNotUnit
                  ? `${BID_MIN_INCREMENT.toLocaleString("ko-KR")}원 단위로 입력해주세요.`
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
              id="mobile-proposal-amount"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-describedby="mobile-proposal-amount-help"
              aria-invalid={isBelowMinimum || isNotUnit}
              value={proposalValue}
              onFocus={() => setIsEditing(true)}
              onChange={(event) => changeProposal(event.target.value)}
              onBlur={finishEditing}
              className={`h-full min-w-0 flex-1 bg-transparent px-4 font-display text-lg font-bold tabular-nums text-text-1 outline-none placeholder:font-sans placeholder:text-base placeholder:font-medium placeholder:text-text-3 ${FOCUS_RING}`}
              placeholder="금액을 입력해주세요"
            />
          </div>
        </div>

        <div className="mt-3.5 rounded-r2 bg-surface-2 p-3 text-[12.5px]">
          <div className="flex items-center justify-between py-0.5 text-text-3">
            <span>제안가</span>
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

        <button
          type="button"
          onClick={handleBid}
          disabled={submitDisabled}
          className={`mt-3 flex h-12 w-full items-center justify-center rounded-[7px] bg-primary text-sm font-extrabold text-white disabled:opacity-60 ${FOCUS_RING}`}
        >
          {isTopBidder
            ? "가격 제안을 보냈어요"
            : submitting
              ? "처리 중..."
              : needsAddress
                ? "배송지 등록하고 가격 제안하기"
                : "가격 제안하기"}
        </button>
        {needsAddress && (
          <p className="mt-2 text-[11.5px] leading-[1.6] text-text-3">
            거래가 성사되면 바로 보내드릴 수 있게 받을 주소를 먼저 등록해요.{" "}
            <b className="font-bold text-text-2">한 번만 하면 다음부터는 물어보지 않아요.</b>
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
    bidCount,
    wishlistCount,
    isLive,
    isOwnAuction,
    isTopBidder,
    addressModalOpen,
    closeAddressModal,
    onAddressSaved,
  } = useAuctionBidding();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickedTab, setPickedTab] = useState<string | null>(null);
  const tab = pickedTab ?? TAB_PRODUCT;

  const specRows: { label: string; value: string }[] = [
    { label: "그룹", value: auction.artistName ?? "-" },
    ...(auction.idolName ? [{ label: "멤버", value: auction.idolName }] : []),
    ...(auction.albumName ? [{ label: "앨범", value: auction.albumName }] : []),
    { label: "출처", value: SOURCE_LABEL[auction.source] ?? auction.source },
    { label: "상태 등급", value: GRADE_LABEL[auction.grade] ?? auction.grade },
    { label: "미개봉", value: auction.unopened ? "예" : "아니오" },
  ];

  return (
    <div className={isLive ? "pb-[76px]" : undefined}>
      <MobileDetailGallery images={auction.images} video={auction.video} title={auction.title} actions={actions} />

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className={`text-[11.5px] font-bold ${isLive ? "text-ok" : "text-text-3"}`}>
            {isLive ? "판매 중" : "판매 종료"}
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

        {/* 가격 패널 — 데스크탑과 같은 최소 제안 금액·제안 수 구성을 사용한다. */}
        <div className="mt-4 rounded-r3 border border-border p-3.5">
          <div className="flex items-start justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-[13px] font-bold text-ok">
              <span className="h-2 w-2 rounded-full bg-ok" aria-hidden="true" />
              판매 중
            </span>
            <dl className="flex shrink-0 divide-x divide-border text-right">
              <div className="pr-3">
                <dt className="text-[10px] font-semibold text-text-3">가격 제안</dt>
                <dd className="mt-0.5 font-display text-lg font-extrabold tabular-nums text-text-1">{bidCount}회</dd>
              </div>
              <div className="pl-3">
                <dt className="text-[10px] font-semibold text-text-3">관심</dt>
                <dd className="mt-0.5 font-display text-lg font-extrabold tabular-nums text-text-1">{wishlistCount}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-[11px] font-semibold text-text-3">판매자 최소 제안 금액</p>
            <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums text-text-1">
              {formatKRW(auction.startPrice)}
            </p>
          </div>
        </div>

        <SellerRow sellerId={auction.sellerId} nickname={auction.sellerNickname} />

        {/* 탭 — 상품 정보 / 배송·환불 */}
        <div role="tablist" className="mt-5 flex gap-1 border-b border-border">
          {[TAB_PRODUCT, TAB_DELIVERY].map((name) => {
            const on = tab === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setPickedTab(name)}
                role="tab"
                aria-selected={on}
                className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors ${FOCUS_RING} ${
                  on ? "border-primary font-extrabold text-text-1" : "border-transparent font-medium text-text-2"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {tab === TAB_DELIVERY ? (
          <div className="pt-3.5">
            {/* 확정된 사실만 적는다 — 기간·조건 같은 숫자는 운영정책이 정본이라 여기서 새로 만들지 않는다. */}
            <dl className="divide-y divide-border border-y border-border">
              <div className="py-2.5">
                <dt className="text-[12.5px] font-extrabold text-text-1">배송비</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-text-2">
                  판매자가 부담해요. 구매자가 따로 낼 배송비는 없어요.
                </dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[12.5px] font-extrabold text-text-1">받는 주소</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-text-2">
                  가격 제안 전에 등록해요. 거래가 성사되면 등록한 주소로 판매자가 보내드려요.
                </dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[12.5px] font-extrabold text-text-1">환불·분쟁</dt>
                <dd className="mt-1 text-[13px] leading-relaxed text-text-2">
                  기준과 절차는 운영정책을 따라요.
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex gap-3">
              <Link href="/policy" className={`text-[12.5px] font-bold text-text-2 underline ${FOCUS_RING}`}>
                운영정책 보기
              </Link>
              <Link href="/guide" className={`text-[12.5px] font-bold text-text-2 underline ${FOCUS_RING}`}>
                이용 방법
              </Link>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-text-3">{INTERMEDIARY_NOTICE}</p>
            {/* 문의는 신고와 성격이 다르다 — 사진 위 아이콘으로 올리지 않고 여기 조용히 둔다. */}
            <Link
              href="/inquiries/new"
              className={`mt-3 inline-block text-[12.5px] font-bold text-text-3 underline ${FOCUS_RING}`}
            >
              이 매물 문의하기
            </Link>
          </div>
        ) : (
          <div className="pt-3.5">
            {auction.description && (
              <p className="whitespace-pre-wrap text-sm leading-[1.75] text-text-2">{auction.description}</p>
            )}
            <dl className={`${auction.description ? "mt-4" : ""} divide-y divide-border border-y border-border`}>
              {specRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <dt className="text-text-3">{row.label}</dt>
                  <dd className="text-right font-semibold text-text-1">{row.value}</dd>
                </div>
              ))}
            </dl>

          </div>
        )}
      </div>

      {/* 하단 고정 바 — 킷과 같은 구성: 관심 44×44 + 제안 CTA(남은 폭 전부).
          현재가·마감은 위 가격 패널과 제안 시트가 말하므로 바에서는 반복하지 않는다. */}
      {isLive && (
        <div
          className="fixed inset-x-0 bottom-0 z-[400] flex items-center gap-2.5 border-t border-border bg-white px-4 pt-2.5 sm:hidden"
          style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
        >
          <AuctionWishlistButton
            auctionId={auctionId}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[7px] border border-border-2 bg-white text-text-2 ${FOCUS_RING}`}
          />
          {isOwnAuction ? (
            <span className="flex h-11 flex-1 items-center justify-center rounded-[7px] bg-surface-2 text-[13.5px] font-bold text-text-3">
              내 매물입니다
            </span>
          ) : !accessToken ? (
            <Link
              href={`/login?redirect=/auctions/${auctionId}`}
              className={`flex h-11 flex-1 items-center justify-center rounded-[7px] bg-primary text-[13.5px] font-extrabold text-white ${FOCUS_RING}`}
            >
              로그인하고 제안하기
            </Link>
          ) : isTopBidder ? (
            <span className="flex h-11 flex-1 items-center justify-center rounded-[7px] bg-surface-2 text-[13.5px] font-bold text-text-3">
              현재 최고가 제안자예요
            </span>
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
      )}

      {sheetOpen && <BidSheet minimumPrice={auction.startPrice} onClose={() => setSheetOpen(false)} />}

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
