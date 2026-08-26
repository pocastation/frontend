"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import DeliveryAddressGateModal from "@/components/DeliveryAddressGateModal";
import { useAuth } from "@/lib/auth-context";
import { useAuctionBidding } from "@/lib/auction-bidding-context";
import { formatKRW, formatCountdown } from "@/lib/format";
import { OFFER_UNIT, buyerFee, estimatedTotal } from "@/lib/fees";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS } from "@/lib/ui";
import { AUCTION_STATUS_LABEL, offerCountLabel } from "@/lib/labels";

// 살아 움직이는 값(제안 인원수·마감시각·제안 요청)은 전부 AuctionBiddingProvider가 갖는다.
// 여기 props로 남은 것은 변하지 않는 표시용 값뿐이다.
//
// 🔴 maxEndAt이 빠졌다 — 안티스나이핑 자동 연장이 폐기되면서(§2.3) 「최대 언제까지 연장될 수
// 있다」는 안내 자체가 사라졌다.
type Props = {
  startPrice: number;
  viewCount: number;
};

/**
 * 상세의 가격 제안 영역.
 *
 * 🔴 **거래 개편 §1.7로 이 화면의 절반이 사라졌다.** 예전에는 ① 제안 가능 구간 사다리
 * (현재가 +1단위 ~ +10단위) ② 체결창처럼 흐르는 실시간 제안 테이프 두 축으로 짜여 있었는데,
 * 둘 다 **남의 호가를 보여주는 장치**라 함께 걷어냈다.
 *
 * 남은 것은 ① 최소가라는 유일한 기준점 ② 제안 인원수라는 참여 신호 둘뿐이다. 정보가 줄어든
 * 만큼 빈 지면이 생기는데, 거기에 장식을 채우지 않는다 — 없는 시장구조를 지어내지 않는다는
 * 원칙은 그대로다.
 */
export default function BidSection({ startPrice, viewCount }: Props) {
  const { accessToken } = useAuth();
  const {
    auctionId,
    offerCount,
    endAt,
    status,
    isLive,
    endingSoon,
    isOwnAuction,
    amount,
    floor,
    outOfRange,
    adjustAmount,
    submitting,
    alreadyOffered,
    handleBid,
    needsAddress,
    addressModalOpen,
    closeAddressModal,
    onAddressSaved,
  } = useAuctionBidding();

  // 모바일 하단 고정 제안바 — 최소가 헤더(제안 CTA)가 화면 밖일 때만 노출(스크롤로 도달하면 숨김).
  const priceHeaderRef = useRef<HTMLDivElement>(null);
  const [priceHeaderInView, setPriceHeaderInView] = useState(false);

  const total = useMemo(() => estimatedTotal(amount), [amount]);

  // 최소가 헤더가 뷰포트에 보이는지 관찰 — 모바일 하단 고정바를 CTA가 화면 밖일 때만 띄우기 위함.
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
      {/* 제안 박스 — 최소가·제안 입력·예상 결제·CTA를 하나의 카드로 묶는다(그림자 없이 헤어라인). */}
      <div ref={priceHeaderRef} className="rounded-r3 border border-border bg-surface p-5">
        {/* 최소가 헤더 — 구매자에게 남은 유일한 가격 기준점이다(§1.7). */}
        <div className="flex items-center justify-between text-xs font-semibold text-text-3">
          <span>최소가</span>
          <span aria-live="polite">{offerCountLabel(offerCount)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="font-display text-3xl font-extrabold text-text-1 tabular-nums">
            {formatKRW(startPrice)}
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
        {/* 🔴 안티스나이핑 안내(「마감 3분 전 제안 시 자동 연장」)는 §2.3으로 폐기됐다 —
            마감 시각에 자동으로 성사되지 않으므로 방어할 대상 자체가 없다. */}
        {isLive && (
          <p className="mt-2 text-[10.5px] leading-[1.6] text-text-3">
            판매자가 제안을 보고 거래 상대를 직접 선택해요. 다른 사람이 얼마를 제안했는지는 공개되지 않아요.
          </p>
        )}
        <div className="mt-3 flex items-center justify-end border-t border-border pt-2.5 text-[11px] text-text-3">
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
              {/* 제안가 — 스테퍼(± · 빠른 가산). 🔴 상한이 없어져(§2.3) 「가능 범위 A–B」를
                  「최소가 이상」으로 바꿨다. 보이지도 않는 현재가를 기준으로 범위를 말할 수 없다. */}
              <div className="mb-2.5 flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-text-1">제안가</span>
                <span className="text-[11px] font-medium text-text-3 tabular-nums">
                  {formatKRW(floor)} 이상 · {OFFER_UNIT.toLocaleString("ko-KR")}원 단위
                </span>
              </div>
              <div className="flex h-[52px] items-stretch overflow-hidden rounded-r2 border border-border">
                <button
                  type="button"
                  onClick={() => adjustAmount(amount - OFFER_UNIT)}
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
                  onClick={() => adjustAmount(amount + OFFER_UNIT)}
                  aria-label="제안가 올리기"
                  className={`w-[52px] text-xl text-text-2 transition-colors hover:bg-surface-2 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-2 ${FOCUS_RING}`}
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex gap-1.5">
                {[OFFER_UNIT, 5000, 10000].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => adjustAmount(amount + delta)}
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
                disabled={submitting || outOfRange || alreadyOffered}
                className={`mt-3.5 flex h-12 w-full items-center justify-center rounded-r2 bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary ${FOCUS_RING}`}
              >
                {/* 🔴 예전 라벨은 「현재 최고가 제안자예요」였다 — 그건 **아무도 나보다 높게
                    내지 않았다**는 남의 제안 상태라 §1.7이 감추기로 한 정보 그 자체다.
                    ⚠️ 제안 수정(Stage 3)이 들어오면 이 잠금 자체가 「수정」으로 대체된다. */}
                {alreadyOffered
                  ? "이미 제안했어요"
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

      {/* 🔴 제안 내역(마스킹 닉네임 + 금액 + 1위 하이라이트) 섹션은 통째로 걷어냈다(§1.7).
          `GET /bids`가 판매자 전용이 되어 구매자가 부르면 403이고, 애초에 이 목록이 「경쟁 호가」를
          그대로 보여주던 자리다. 빈 지면에 장식을 채우지 않는다 — 보여줄 것이 줄어든 게 사실이다.
          제안 인원수는 위 헤더가 이미 말하고 있다. */}

      {/* 모바일 하단 고정 제안바 — 상세가 세로로 길어 제안 CTA가 맨 아래라, 라이브일 때 최소가와
          제안 버튼을 항상 손닿는 곳에 둔다. 실제 제안 영역이 보이면(스크롤로 도달) 숨겨 중복을 피한다. */}
      {isLive && !priceHeaderInView && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-surface px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] sm:hidden">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold text-text-3">최소가</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-extrabold text-text-1 tabular-nums">
                {formatKRW(startPrice)}
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
          ) : alreadyOffered ? (
            <span className="shrink-0 rounded-r2 bg-surface-2 px-4 py-2.5 text-sm font-bold text-text-3">
              이미 제안함
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
