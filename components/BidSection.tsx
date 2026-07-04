"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError, apiStreamUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW, formatTimeLeft, isBeforeEnd } from "@/lib/format";
import {
  BID_MIN_INCREMENT,
  buyerFee,
  estimatedTotal,
  maxNextBid,
  minNextBid,
} from "@/lib/fees";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS } from "@/lib/ui";
import type {
  AuctionStatus,
  BidHistoryItem,
  BidListResponse,
  BidResponse,
  BidStreamEvent,
} from "@/lib/types";

type Props = {
  auctionId: number;
  initialCurrentPrice: number;
  initialBidCount: number;
  initialEndAt: string;
  status: AuctionStatus;
};

// 마감/유찰 등 종료 상태를 한국어로. LIVE는 남은시간(카운트다운)이 대신 표시된다.
const STATUS_LABEL: Partial<Record<AuctionStatus, string>> = {
  ENDED_SOLD: "낙찰 종료",
  ENDED_NO_BIDS: "유찰 종료",
  SCHEDULED: "시작 전",
};

export default function BidSection({
  auctionId,
  initialCurrentPrice,
  initialBidCount,
  initialEndAt,
  status,
}: Props) {
  const { accessToken, fetchWithAuth } = useAuth();

  const [currentPrice, setCurrentPrice] = useState(initialCurrentPrice);
  const [bidCount, setBidCount] = useState(initialBidCount);
  const [endAt, setEndAt] = useState(initialEndAt);
  const [bids, setBids] = useState<BidHistoryItem[]>([]);
  const [amount, setAmount] = useState(() => minNextBid(initialCurrentPrice, initialBidCount));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  // 다른 사람 입찰로 현재가가 오르면 입력값 하한도 따라 올려야 한다. 단 사용자가 이미
  // 하한보다 높게 직접 올려둔 값은 존중한다.
  const amountTouchedRef = useRef(false);

  const isLive = status === "LIVE" && isBeforeEnd(endAt);
  const floor = minNextBid(currentPrice, bidCount);
  const ceil = maxNextBid(currentPrice);

  const fetchBids = useCallback(async () => {
    try {
      const res = await apiFetch<BidListResponse>(
        `/api/auctions/${auctionId}/bids?page=0&size=20`,
        { cache: "no-store" },
      );
      setBids(res.content);
    } catch {
      // 내역 조회 실패는 입찰 흐름을 막지 않는다(가격/카운트다운은 SSE로 계속 갱신).
    }
  }, [auctionId]);

  // 초기 입찰 내역 로드. 외부(API)에서 읽어와 채우는 정당한 데이터 페치라 setState는 await 뒤에 일어난다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 서버에서 입찰내역 1회 로드(동기 setState 아님, await 후 갱신)
    fetchBids();
  }, [fetchBids]);

  // 실시간 호가 구독(공개 SSE) — 새 입찰이 오면 가격/입찰수/마감시각을 즉시 반영하고
  // 내역은 재조회로 authoritative하게 갱신한다. 종료된 경매는 구독하지 않는다.
  useEffect(() => {
    if (status !== "LIVE") return;

    const source = new EventSource(apiStreamUrl(`/api/auctions/${auctionId}/bids/stream`));
    source.addEventListener("bid", (e) => {
      const data: BidStreamEvent = JSON.parse((e as MessageEvent).data);
      setCurrentPrice(data.currentPrice);
      setBidCount(data.bidCount);
      setEndAt(data.endAt);
      // 새 입찰로 상태가 바뀌면 직전 검증 에러(예: "이미 최고 입찰자")는 더 이상 유효하지 않다.
      setMessage(null);
      fetchBids();
    });
    // 연결 오류(서버 재시작 등)는 EventSource가 자동 재연결하므로 로깅만 생략하고 둔다.
    source.onerror = () => {};

    return () => source.close();
  }, [auctionId, status, fetchBids]);

  // 현재가가 오르면 아직 사용자가 직접 안 건드린 입력값을 새 하한으로 끌어올린다.
  useEffect(() => {
    if (!amountTouchedRef.current) {
      setAmount(minNextBid(currentPrice, bidCount));
    }
  }, [currentPrice, bidCount]);

  const stepDown = () => {
    amountTouchedRef.current = true;
    setAmount((v) => Math.max(floor, v - BID_MIN_INCREMENT));
  };
  const stepUp = () => {
    amountTouchedRef.current = true;
    setAmount((v) => Math.min(ceil, v + BID_MIN_INCREMENT));
  };

  const total = useMemo(() => estimatedTotal(amount), [amount]);

  const outOfRange = amount < floor || amount > ceil;

  async function handleBid() {
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetchWithAuth<BidResponse>(`/api/auctions/${auctionId}/bids`, {
        method: "POST",
        body: { amount },
      });
      setCurrentPrice(res.currentPrice);
      setBidCount(res.bidCount);
      setEndAt(res.endAt);
      amountTouchedRef.current = false;
      setMessage({
        type: "ok",
        text: res.extended ? "입찰 완료! 마감 임박으로 종료 시간이 연장됐어요." : "입찰 완료!",
      });
      fetchBids();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof ApiError ? err.message : "입찰에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      {/* 가격 박스 (실시간 갱신) */}
      <div className="rounded-r3 border border-border bg-surface p-4 shadow-card">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold text-text-3">현재가</span>
          <span className="font-display text-2xl font-extrabold text-text-1" aria-live="polite">
            {formatKRW(currentPrice)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-end text-xs text-text-3">
          <span>입찰 {bidCount}회</span>
        </div>
        <p className="mt-2 text-xs font-semibold text-accent">
          {isLive ? formatTimeLeft(endAt) : (STATUS_LABEL[status] ?? "종료")}
        </p>
      </div>

      {/* 입찰 패널 (진행 중일 때만) */}
      {isLive && (
        <div className="mt-4">
          {accessToken ? (
            <>
              <div className="flex items-stretch gap-2">
                <div className="flex flex-1 items-center rounded-r2 border border-border">
                  <button
                    type="button"
                    onClick={stepDown}
                    disabled={amount <= floor}
                    aria-label="1호가 내리기"
                    className={`h-11 w-11 shrink-0 rounded-l-r2 text-lg font-bold text-text-2 transition-colors hover:bg-surface-2 disabled:opacity-40 ${FOCUS_RING}`}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    step={BID_MIN_INCREMENT}
                    value={amount}
                    onChange={(e) => {
                      amountTouchedRef.current = true;
                      setAmount(Number(e.target.value) || 0);
                    }}
                    aria-label="입찰 금액"
                    aria-invalid={outOfRange || undefined}
                    className="h-11 w-full min-w-0 border-x border-border bg-transparent text-center text-sm font-bold text-text-1 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={stepUp}
                    disabled={amount >= ceil}
                    aria-label="1호가 올리기"
                    className={`h-11 w-11 shrink-0 rounded-r-r2 text-lg font-bold text-text-2 transition-colors hover:bg-surface-2 disabled:opacity-40 ${FOCUS_RING}`}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleBid}
                  disabled={submitting || outOfRange}
                  className={`h-11 shrink-0 px-6 ${PRIMARY_BUTTON_CLASS}`}
                >
                  {submitting ? "처리 중..." : "입찰하기"}
                </button>
              </div>

              <p className="mt-1.5 text-[11px] text-text-3">
                입찰 가능 범위 {formatKRW(floor)} ~ {formatKRW(ceil)} (1호가 {formatKRW(BID_MIN_INCREMENT)})
              </p>

              {/* 예상 결제 총액 (추정치) */}
              <div className="mt-3 rounded-r2 bg-surface-2 p-3 text-xs">
                <div className="flex items-center justify-between text-text-3">
                  <span>입찰가</span>
                  <span className="font-semibold text-text-2">{formatKRW(amount)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-text-3">
                  <span>구매자 수수료</span>
                  <span className="font-semibold text-text-2">{formatKRW(buyerFee(amount))}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <span className="font-semibold text-text-2">예상 결제 총액</span>
                  <span className="font-display text-sm font-extrabold text-primary">
                    {formatKRW(total)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-text-3">
                  낙찰 시 예상 금액이며 실제 청구액과 다를 수 있습니다.
                </p>
              </div>

              {message && (
                <p
                  role="alert"
                  aria-live="polite"
                  className={`mt-2 rounded-r2 px-3 py-2 text-xs font-semibold ${
                    message.type === "ok" ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent"
                  }`}
                >
                  {message.text}
                </p>
              )}
            </>
          ) : (
            <Link
              href={`/login?redirect=/auctions/${auctionId}`}
              className={`flex h-11 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
            >
              로그인하고 입찰하기
            </Link>
          )}
        </div>
      )}

      {/* 입찰 내역 */}
      <section className="mt-6">
        <h2 className="text-sm font-bold text-text-1">
          입찰 내역 {bidCount > 0 && <span className="text-text-3">({bidCount})</span>}
        </h2>
        {bids.length > 0 ? (
          <ul className="mt-2 divide-y divide-border rounded-r2 border border-border">
            {bids.map((bid, index) => (
              <li key={bid.id} className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-text-2">
                  {index === 0 && (
                    <span className="mr-1.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      최고가
                    </span>
                  )}
                  {bid.bidderNicknameMasked}
                </span>
                <span className="font-semibold text-text-1">{formatKRW(bid.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-text-3">아직 입찰이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
