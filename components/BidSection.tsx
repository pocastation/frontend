"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import DeliveryAddressGateModal from "@/components/DeliveryAddressGateModal";
import { useAuth } from "@/lib/auth-context";
import { useAuctionBidding } from "@/lib/auction-bidding-context";
import { formatKRW, formatCountdown, formatRelativeTime, formatDateTimeKST } from "@/lib/format";
import { BID_MIN_INCREMENT, buyerFee, estimatedTotal } from "@/lib/fees";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS } from "@/lib/ui";
import { AUCTION_STATUS_LABEL } from "@/lib/labels";

// 살아 움직이는 값(현재가·제안수·마감시각·내역·제안 요청)은 전부 AuctionBiddingProvider가 갖는다.
// 여기 props로 남은 것은 변하지 않는 표시용 값뿐이다.
type Props = {
  maxEndAt: string | null;
  startPrice: number;
  viewCount: number;
};

// 상세의 가격 제안 영역 — 매도측 잔량이 없으므로 주식 호가창을 그대로 옮기지 않고, ① 제안 가능
// 구간을 보여주는 사다리(현재가 +1단위 ~ +10단위 상한) ② 체결창처럼 흐르는 실시간 제안 테이프로
// 재해석한다(§1 신뢰 — 없는 시장구조를 지어내지 않음).
export default function BidSection({ maxEndAt, startPrice, viewCount }: Props) {
  const { accessToken } = useAuth();
  const {
    auctionId,
    currentPrice,
    bidCount,
    endAt,
    status,
    isLive,
    endingSoon,
    isOwnAuction,
    bids,
    hasMoreBids,
    loadMoreBids,
    amount,
    floor,
    ceil,
    outOfRange,
    adjustAmount,
    submitting,
    isTopBidder,
    handleBid,
    needsAddress,
    addressModalOpen,
    closeAddressModal,
    onAddressSaved,
  } = useAuctionBidding();

  // 모바일 하단 고정 제안바 — 현재가 헤더(제안 CTA)가 화면 밖일 때만 노출(스크롤로 도달하면 숨김).
  const priceHeaderRef = useRef<HTMLDivElement>(null);
  const [priceHeaderInView, setPriceHeaderInView] = useState(false);

  const total = useMemo(() => estimatedTotal(amount), [amount]);

  // 현재가 헤더가 뷰포트에 보이는지 관찰 — 모바일 하단 고정바를 CTA가 화면 밖일 때만 띄우기 위함.
  // rootMargin 하단 -76px는 고정바 높이만큼 미리 숨겨 겹침을 피한다.
  useEffect(() => {
    const el = priceHeaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPriceHeaderInView(entry.isIntersecting),
      { rootMargin: "0px 0px -76px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function scrollToBid() {
    priceHeaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mt-6">
      {/* 제안 박스 — 현재가·제안 입력·예상 결제·CTA를 하나의 카드로 묶는다(그림자 없이 헤어라인). */}
      <div ref={priceHeaderRef} className="rounded-r3 border border-border bg-surface p-5">
        {/* 현재가 헤더 */}
        <div className="flex items-center justify-between text-xs font-semibold text-text-3">
          <span>현재가</span>
          <span>제안 {bidCount}회</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="font-display text-3xl font-extrabold text-text-1 tabular-nums" aria-live="polite">
            {formatKRW(currentPrice)}
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            {isLive && <span className="text-[10px] font-medium text-text-3">마감까지</span>}
            <span
              className={`text-sm font-bold tabular-nums ${
                !isLive
                  ? "text-text-3"
                  : endingSoon
                    ? "rounded-r1 bg-warn-soft px-2 py-0.5 text-warn"
                    : "text-text-1"
              }`}
            >
              {isLive ? formatCountdown(endAt) : (AUCTION_STATUS_LABEL[status] ?? "종료")}
            </span>
          </span>
        </div>
        {isLive && (
          <p className="mt-2 text-[10.5px] text-text-3">
            마감 3분 전 제안 시 종료 시간이 자동 연장돼요(최대 3회).
            {maxEndAt && (
              <>
                {" "}
                최대 <span className="font-semibold text-text-2">{formatDateTimeKST(maxEndAt)}</span>까지 연장될 수 있어요.
              </>
            )}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-text-3">
          <span>
            시작 제안가 <span className="font-semibold text-text-2 tabular-nums">{formatKRW(startPrice)}</span>
          </span>
          <span>
            조회 <span className="font-semibold text-text-2 tabular-nums">{viewCount.toLocaleString("ko-KR")}</span>
          </span>
        </div>

        {/* 제안 영역 (진행 중일 때만) — 같은 카드 안, 헤어라인으로 구분 */}
        {isLive &&
          (isOwnAuction ? (
            <div className="mt-4 rounded-r2 border border-border bg-surface-2 p-4 text-center text-sm font-semibold text-text-2">
              내 매물입니다. 직접 제안할 수 없어요.
            </div>
          ) : !accessToken ? (
            <Link
              href={`/login?redirect=/auctions/${auctionId}`}
              className={`mt-4 flex h-12 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
            >
              로그인하고 제안하기
            </Link>
          ) : (
            <div className="mt-4 border-t border-border pt-4">
              {/* 제안가 — v0 스테퍼(± · 빠른 가산). 사다리를 대체하되 min/max·수수료 로직은 그대로 유지. */}
              <div className="mb-2.5 flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-text-1">제안가</span>
                <span className="text-[11px] font-medium text-text-3 tabular-nums">
                  가능 범위 {formatKRW(floor)} – {formatKRW(ceil)}
                </span>
              </div>
              <div className="flex h-[52px] items-stretch overflow-hidden rounded-r2 border border-border">
                <button
                  type="button"
                  onClick={() => adjustAmount(amount - BID_MIN_INCREMENT)}
                  disabled={amount <= floor}
                  aria-label="제안가 내리기"
                  className={`w-[52px] text-xl text-text-2 transition-colors hover:bg-surface-2 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-2 ${FOCUS_RING}`}
                >
                  −
                </button>
                <div
                  className="flex flex-1 items-center justify-center border-x border-border font-display text-xl font-bold tabular-nums text-text-1"
                  aria-live="polite"
                >
                  {formatKRW(amount)}
                </div>
                <button
                  type="button"
                  onClick={() => adjustAmount(amount + BID_MIN_INCREMENT)}
                  disabled={amount >= ceil}
                  aria-label="제안가 올리기"
                  className={`w-[52px] text-xl text-text-2 transition-colors hover:bg-surface-2 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-2 ${FOCUS_RING}`}
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex gap-1.5">
                {[BID_MIN_INCREMENT, 5000, 10000].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => adjustAmount(amount + delta)}
                    disabled={amount >= ceil}
                    className={`h-9 flex-1 rounded-r2 border border-border text-xs font-medium text-text-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-2 ${FOCUS_RING}`}
                  >
                    +{delta.toLocaleString("ko-KR")}
                  </button>
                ))}
              </div>

              {/* 예상 결제 총액 — 연회색 박스. 총액은 뉴트럴(보라 아님). */}
              <div className="mt-4 rounded-r2 bg-surface-2 p-3.5 text-[13px]">
                <div className="flex items-center justify-between py-0.5 text-text-3">
                  <span>제안가</span>
                  <span className="font-medium tabular-nums text-text-2">{formatKRW(amount)}</span>
                </div>
                <div className="flex items-center justify-between py-0.5 text-text-3">
                  <span>구매자 수수료</span>
                  <span className="font-medium tabular-nums text-text-2">{formatKRW(buyerFee(amount))}</span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between border-t border-border pt-2.5">
                  <span className="font-bold text-text-1">예상 결제 총액</span>
                  <span className="font-display text-lg font-bold tabular-nums text-text-1">{formatKRW(total)}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-text-3">거래 성사 시 예상 금액이며 실제 청구액과 다를 수 있습니다.</p>
              </div>

              <button
                type="button"
                onClick={handleBid}
                disabled={submitting || outOfRange || isTopBidder}
                className={`mt-3.5 flex h-12 w-full items-center justify-center rounded-r2 bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary ${FOCUS_RING}`}
              >
                {isTopBidder
                  ? "현재 최고가 제안자예요"
                  : submitting
                    ? "처리 중..."
                    : needsAddress
                      ? "배송지 등록하고 제안하기"
                      : `${formatKRW(amount)} 제안하기`}
              </button>
              {/* 누르기 전에 알려준다(#283) — 마감 임박에 알게 되면 등록할 시간이 없다.
                  버튼은 비활성화하지 않는다. 회색 버튼은 이유를 말해주지 않는다. */}
              {needsAddress && (
                <p className="mt-2 text-[11.5px] leading-[1.6] text-text-3">
                  거래가 성사되면 바로 보내드릴 수 있게 받을 주소를 먼저 등록해요.{" "}
                  <b className="font-bold text-text-2">한 번만 하면 다음부터는 물어보지 않아요.</b>
                </p>
              )}
            </div>
          ))}
      </div>

      {/* 제안 내역 — 1위 행은 연보라 하이라이트 + 순번 배지, 나머지는 헤어라인 행 */}
      <section className="mt-4 rounded-r3 border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-1">
            제안 내역 {bidCount > 0 && <span className="text-text-3">({bidCount})</span>}
          </h2>
          {isLive && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-ok">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
              LIVE
            </span>
          )}
        </div>
        {bids.length > 0 ? (
          <ul className="mt-2 flex flex-col">
            {bids.map((bid, index) => {
              const isTop = index === 0;
              return (
                <li
                  key={bid.id}
                  className={`flex items-center justify-between px-3 py-2.5 text-xs ${
                    isTop
                      ? "mb-1 rounded-r2 bg-primary-soft"
                      : "border-b border-border last:border-b-0"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        isTop
                          ? "flex h-5 w-5 items-center justify-center rounded-r1 border border-primary text-[11px] font-bold text-primary"
                          : "w-5 text-center text-[11px] font-bold text-text-3"
                      }
                    >
                      {index + 1}
                    </span>
                    <span className={`font-semibold ${isTop ? "text-text-1" : "text-text-2"}`}>
                      {bid.bidderNicknameMasked}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-[10px] text-text-3">{formatRelativeTime(bid.createdAt)}</span>
                    <span className={`tabular-nums ${isTop ? "text-sm font-bold text-text-1" : "text-text-2"}`}>
                      {formatKRW(bid.amount)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-text-3">아직 제안이 없습니다.</p>
        )}
        {hasMoreBids && (
          <button
            type="button"
            onClick={loadMoreBids}
            className={`mt-2 flex h-9 w-full items-center justify-center rounded-r2 border border-border text-xs font-semibold text-text-2 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
          >
            더보기
          </button>
        )}
      </section>

      {/* 모바일 하단 고정 제안바 — 상세가 세로로 길어 제안 CTA가 맨 아래라, 라이브일 때 현재가와
          제안 버튼을 항상 손닿는 곳에 둔다. 실제 제안 영역이 보이면(스크롤로 도달) 숨겨 중복을 피한다. */}
      {isLive && !priceHeaderInView && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-surface px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] sm:hidden">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold text-text-3">현재가</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-extrabold text-text-1 tabular-nums">
                {formatKRW(currentPrice)}
              </span>
              <span className={`truncate text-[11px] font-bold tabular-nums ${endingSoon ? "text-warn" : "text-text-3"}`}>
                {formatCountdown(endAt)}
              </span>
            </div>
          </div>
          {isOwnAuction ? (
            <span className="shrink-0 rounded-r2 bg-surface-2 px-4 py-2.5 text-sm font-bold text-text-3">
              내 매물
            </span>
          ) : !accessToken ? (
            <Link
              href={`/login?redirect=/auctions/${auctionId}`}
              className={`flex h-11 shrink-0 items-center justify-center px-5 ${PRIMARY_BUTTON_CLASS}`}
            >
              로그인하고 제안
            </Link>
          ) : isTopBidder ? (
            <span className="shrink-0 rounded-r2 bg-surface-2 px-4 py-2.5 text-sm font-bold text-text-3">
              최고가 제안자
            </span>
          ) : (
            <button
              type="button"
              onClick={scrollToBid}
              className={`flex h-11 shrink-0 items-center justify-center px-6 ${PRIMARY_BUTTON_CLASS}`}
            >
              제안하기
            </button>
          )}
        </div>
      )}

      {/* 배송지 등록(#283). 저장해도 제안을 대신 눌러주지 않는다 — 가격 제안은 취소할 수 없는 청약이라
          사용자가 한 번 더 눌러야 한다(약관 §13조의2 ②). 대신 버튼이 정상 라벨로 돌아오고
          제안 박스로 스크롤해 흐름이 끊긴 느낌을 줄인다. */}
      {addressModalOpen && (
        <DeliveryAddressGateModal
          action="가격 제안"
          onClose={closeAddressModal}
          onSaved={() => onAddressSaved(scrollToBid)}
        />
      )}
    </div>
  );
}
