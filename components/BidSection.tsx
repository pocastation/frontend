"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError, apiStreamUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatKRW, formatCountdown, formatRelativeTime, formatDateTimeKST, isBeforeEnd, isEndingSoon } from "@/lib/format";
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
  maxEndAt: string | null;
  status: AuctionStatus;
  sellerNickname: string;
  startPrice: number;
  viewCount: number;
};

// 마감/유찰 등 종료 상태를 한국어로. LIVE는 카운트다운이 대신 표시된다.
const STATUS_LABEL: Partial<Record<AuctionStatus, string>> = {
  ENDED_SOLD: "낙찰 종료",
  ENDED_NO_BIDS: "유찰 종료",
  SCHEDULED: "시작 전",
};

// 경매 상세의 "호가창" — 영어경매는 양방향 잔량(매도측)이 없으므로 주식 호가창을 그대로 옮기지
// 않고, ① 입찰 가능 구간을 보여주는 호가 사다리(현재가+1호가 ~ +10호가 상한) ② 체결창처럼 흐르는
// 실시간 입찰 테이프로 재해석한다(§1 신뢰 — 없는 시장구조를 지어내지 않음).
export default function BidSection({
  auctionId,
  initialCurrentPrice,
  initialBidCount,
  initialEndAt,
  maxEndAt,
  status,
  sellerNickname,
  startPrice,
  viewCount,
}: Props) {
  const { member, accessToken, fetchWithAuth } = useAuth();
  const toast = useToast();

  const [currentPrice, setCurrentPrice] = useState(initialCurrentPrice);
  const [bidCount, setBidCount] = useState(initialBidCount);
  const [endAt, setEndAt] = useState(initialEndAt);
  const [bids, setBids] = useState<BidHistoryItem[]>([]);
  const [bidPage, setBidPage] = useState(0);
  const [bidTotalPages, setBidTotalPages] = useState(1);
  const [amount, setAmount] = useState(() => minNextBid(initialCurrentPrice, initialBidCount));
  const [submitting, setSubmitting] = useState(false);
  // 내가 현재 최고 입찰자인지 — 내 입찰 성공/서버 '이미 최고 입찰자' 응답으로 켜지고, 남이 추월(SSE)하면 꺼진다.
  const [isTopBidder, setIsTopBidder] = useState(false);
  const myTopBidRef = useRef<number | null>(null);
  // 카운트다운/상대시각을 1초마다 다시 그리기 위한 틱(값은 안 읽고 리렌더 트리거로만 쓴다).
  const [, setNowTick] = useState(0);
  // 다른 사람 입찰로 현재가가 오르면 입력값 하한도 따라 올려야 한다. 단 사용자가 사다리에서
  // 직접 고른 값은 존중한다.
  const amountTouchedRef = useRef(false);
  // 모바일 하단 고정 입찰바 — 현재가 헤더(입찰 CTA)가 화면 밖일 때만 노출(스크롤로 도달하면 숨김).
  const priceHeaderRef = useRef<HTMLDivElement>(null);
  const [priceHeaderInView, setPriceHeaderInView] = useState(false);

  const isLive = status === "LIVE" && isBeforeEnd(endAt);
  // 마감 임박일 때만 카운트다운을 주황(warn)으로 강조 — 그 외에는 뉴트럴로 둔다(색 절제).
  const endingSoon = isLive && isEndingSoon(endAt);
  const isOwnAuction = member?.nickname != null && member.nickname === sellerNickname;
  const floor = minNextBid(currentPrice, bidCount);
  const ceil = maxNextBid(currentPrice);
  const outOfRange = amount < floor || amount > ceil;
  const total = useMemo(() => estimatedTotal(amount), [amount]);

  // 최신 순으로 첫 페이지를 다시 받아 교체한다(입찰 발생 시 authoritative하게 갱신).
  const fetchBids = useCallback(async () => {
    try {
      const res = await apiFetch<BidListResponse>(
        `/api/auctions/${auctionId}/bids?page=0&size=20`,
        { cache: "no-store" },
      );
      setBids(res.content);
      setBidPage(0);
      setBidTotalPages(res.totalPages);
    } catch {
      // 내역 조회 실패는 입찰 흐름을 막지 않는다(가격/카운트다운은 SSE로 계속 갱신).
    }
  }, [auctionId]);

  // "더보기" — 다음 페이지를 이어 붙인다. 그 사이 새 입찰이 들어와도 이미 받은 앞쪽 페이지와
  // 겹치지 않게, 첫 페이지 교체(fetchBids)와는 분리된 흐름으로 둔다.
  async function loadMoreBids() {
    const nextPage = bidPage + 1;
    try {
      const res = await apiFetch<BidListResponse>(
        `/api/auctions/${auctionId}/bids?page=${nextPage}&size=20`,
        { cache: "no-store" },
      );
      setBids((prev) => [...prev, ...res.content]);
      setBidPage(nextPage);
      setBidTotalPages(res.totalPages);
    } catch {
      // 실패해도 이미 보이는 내역은 유지한다.
    }
  }

  // 초기 입찰 내역 로드.
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
      // 내 최고가보다 높은 입찰이 들어오면 추월된 것 — 내 SSE 에코(같은 금액)는 무시한다.
      if (myTopBidRef.current != null && data.currentPrice > myTopBidRef.current) {
        myTopBidRef.current = null;
        setIsTopBidder(false);
      }
      fetchBids();
    });
    source.onerror = () => {};

    return () => source.close();
  }, [auctionId, status, fetchBids]);

  // 라이브 카운트다운/상대시각을 1초마다 갱신. 종료된 경매는 틱 불필요.
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  // 현재가가 오르면 아직 사용자가 직접 안 고른 입력값을 새 하한으로 끌어올린다.
  useEffect(() => {
    if (!amountTouchedRef.current) {
      setAmount(minNextBid(currentPrice, bidCount));
    }
  }, [currentPrice, bidCount]);

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

  // 입찰가 조정(스테퍼 ± · 빠른 가산) — 입찰 가능 범위[floor, ceil]로 클램프하고,
  // 사용자가 직접 조정했음을 표시해 현재가 상승 시 자동 rebase가 값을 덮어쓰지 않게 한다.
  function adjustAmount(next: number) {
    amountTouchedRef.current = true;
    setAmount(Math.max(floor, Math.min(ceil, next)));
  }

  function scrollToBid() {
    priceHeaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleBid() {
    setSubmitting(true);
    try {
      const res = await fetchWithAuth<BidResponse>(`/api/auctions/${auctionId}/bids`, {
        method: "POST",
        body: { amount },
      });
      setCurrentPrice(res.currentPrice);
      setBidCount(res.bidCount);
      setEndAt(res.endAt);
      // 내가 방금 최고가가 됐다 — 버튼을 잠그고, 추월 감지를 위해 내 금액을 기록한다.
      myTopBidRef.current = res.currentPrice;
      setIsTopBidder(true);
      // 내 입찰 성공 시 다음 최소 입찰가로 즉시 올려둔다. rebase 효과에만 맡기면, 서버가 커밋
      // 직후 쏘는 SSE가 POST 응답보다 먼저 도착해 currentPrice를 갱신할 때 amountTouchedRef가
      // 아직 true라 스킵되고, 이후 값이 안 바뀌어 재실행도 안 돼 옛 입찰가에 갇히는 레이스가 있다.
      amountTouchedRef.current = false;
      setAmount(minNextBid(res.currentPrice, res.bidCount));
      toast.show({
        variant: res.extended ? "warn" : "success",
        text: res.extended
          ? "입찰 완료 · 마감 임박으로 종료 시간이 연장됐어요."
          : "입찰 완료! 현재 최고 입찰자가 되었어요.",
      });
      fetchBids();
    } catch (err) {
      const text = err instanceof ApiError ? err.message : "입찰에 실패했습니다. 잠시 후 다시 시도해주세요.";
      // '이미 최고 입찰자'는 에러가 아니라 정상 상태 — 정보 톤으로 안내하고 버튼도 잠근다.
      if (err instanceof ApiError && err.message.includes("최고 입찰")) {
        setIsTopBidder(true);
        toast.show({
          variant: "info",
          text: "이미 회원님이 최고 입찰자예요.",
          sub: "더 높은 금액으로만 다시 입찰할 수 있어요.",
        });
      } else {
        toast.show({ variant: "danger", text });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      {/* 입찰 박스 — 현재가·입찰 입력·예상 결제·CTA를 하나의 카드로 묶는다(그림자 없이 헤어라인). */}
      <div ref={priceHeaderRef} className="rounded-r3 border border-border bg-surface p-5">
        {/* 현재가 헤더 */}
        <div className="flex items-center justify-between text-xs font-semibold text-text-3">
          <span>현재가</span>
          <span>입찰 {bidCount}회</span>
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
              {isLive ? formatCountdown(endAt) : (STATUS_LABEL[status] ?? "종료")}
            </span>
          </span>
        </div>
        {isLive && (
          <p className="mt-2 text-[10.5px] text-text-3">
            마감 3분 전 입찰 시 종료 시간이 자동 연장돼요(최대 3회).
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
            시작가 <span className="font-semibold text-text-2 tabular-nums">{formatKRW(startPrice)}</span>
          </span>
          <span>
            조회 <span className="font-semibold text-text-2 tabular-nums">{viewCount.toLocaleString("ko-KR")}</span>
          </span>
        </div>

        {/* 입찰 영역 (진행 중일 때만) — 같은 카드 안, 헤어라인으로 구분 */}
        {isLive &&
          (isOwnAuction ? (
            <div className="mt-4 rounded-r2 border border-border bg-surface-2 p-4 text-center text-sm font-semibold text-text-2">
              내 경매입니다. 직접 입찰할 수 없어요.
            </div>
          ) : !accessToken ? (
            <Link
              href={`/login?redirect=/auctions/${auctionId}`}
              className={`mt-4 flex h-12 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
            >
              로그인하고 입찰하기
            </Link>
          ) : (
            <div className="mt-4 border-t border-border pt-4">
              {/* 입찰가 — v0 스테퍼(± · 빠른 가산). 호가 사다리를 대체하되 min/max·수수료 로직은 그대로 유지. */}
              <div className="mb-2.5 flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-text-1">입찰가</span>
                <span className="text-[11px] font-medium text-text-3 tabular-nums">
                  가능 범위 {formatKRW(floor)} – {formatKRW(ceil)}
                </span>
              </div>
              <div className="flex h-[52px] items-stretch overflow-hidden rounded-r2 border border-border">
                <button
                  type="button"
                  onClick={() => adjustAmount(amount - BID_MIN_INCREMENT)}
                  disabled={amount <= floor}
                  aria-label="입찰가 내리기"
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
                  aria-label="입찰가 올리기"
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
                  <span>입찰가</span>
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
                <p className="mt-1.5 text-[11px] text-text-3">낙찰 시 예상 금액이며 실제 청구액과 다를 수 있습니다.</p>
              </div>

              <button
                type="button"
                onClick={handleBid}
                disabled={submitting || outOfRange || isTopBidder}
                className={`mt-3.5 flex h-12 w-full items-center justify-center rounded-r2 bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary ${FOCUS_RING}`}
              >
                {isTopBidder
                  ? "현재 최고 입찰자예요"
                  : submitting
                    ? "처리 중..."
                    : `${formatKRW(amount)} 입찰하기`}
              </button>
            </div>
          ))}
      </div>

      {/* 입찰 이력 — 1위 행은 연보라 하이라이트 + 순번 배지, 나머지는 헤어라인 행 */}
      <section className="mt-4 rounded-r3 border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-1">
            입찰 이력 {bidCount > 0 && <span className="text-text-3">({bidCount})</span>}
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
          <p className="mt-2 text-xs text-text-3">아직 입찰이 없습니다.</p>
        )}
        {bidPage + 1 < bidTotalPages && (
          <button
            type="button"
            onClick={loadMoreBids}
            className={`mt-2 flex h-9 w-full items-center justify-center rounded-r2 border border-border text-xs font-semibold text-text-2 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
          >
            더보기
          </button>
        )}
      </section>

      {/* 모바일 하단 고정 입찰바 — 상세가 세로로 길어 입찰 CTA가 맨 아래라, 라이브일 때 현재가와
          입찰 버튼을 항상 손닿는 곳에 둔다. 실제 입찰 영역이 보이면(스크롤로 도달) 숨겨 중복을 피한다. */}
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
              내 경매
            </span>
          ) : !accessToken ? (
            <Link
              href={`/login?redirect=/auctions/${auctionId}`}
              className={`flex h-11 shrink-0 items-center justify-center px-5 ${PRIMARY_BUTTON_CLASS}`}
            >
              로그인하고 입찰
            </Link>
          ) : isTopBidder ? (
            <span className="shrink-0 rounded-r2 bg-surface-2 px-4 py-2.5 text-sm font-bold text-text-3">
              최고 입찰자
            </span>
          ) : (
            <button
              type="button"
              onClick={scrollToBid}
              className={`flex h-11 shrink-0 items-center justify-center px-6 ${PRIMARY_BUTTON_CLASS}`}
            >
              입찰하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
