"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError, apiStreamUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW, formatCountdown, formatRelativeTime, isBeforeEnd } from "@/lib/format";
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
  status,
  sellerNickname,
  startPrice,
  viewCount,
}: Props) {
  const { member, accessToken, fetchWithAuth } = useAuth();

  const [currentPrice, setCurrentPrice] = useState(initialCurrentPrice);
  const [bidCount, setBidCount] = useState(initialBidCount);
  const [endAt, setEndAt] = useState(initialEndAt);
  const [bids, setBids] = useState<BidHistoryItem[]>([]);
  const [bidPage, setBidPage] = useState(0);
  const [bidTotalPages, setBidTotalPages] = useState(1);
  const [amount, setAmount] = useState(() => minNextBid(initialCurrentPrice, initialBidCount));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  // 카운트다운/상대시각을 1초마다 다시 그리기 위한 틱(값은 안 읽고 리렌더 트리거로만 쓴다).
  const [, setNowTick] = useState(0);
  // 다른 사람 입찰로 현재가가 오르면 입력값 하한도 따라 올려야 한다. 단 사용자가 사다리에서
  // 직접 고른 값은 존중한다.
  const amountTouchedRef = useRef(false);
  // 모바일 하단 고정 입찰바 — 현재가 헤더(입찰 CTA)가 화면 밖일 때만 노출(스크롤로 도달하면 숨김).
  const priceHeaderRef = useRef<HTMLDivElement>(null);
  const [priceHeaderInView, setPriceHeaderInView] = useState(false);

  const isLive = status === "LIVE" && isBeforeEnd(endAt);
  const isOwnAuction = member?.nickname != null && member.nickname === sellerNickname;
  const floor = minNextBid(currentPrice, bidCount);
  const ceil = maxNextBid(currentPrice);
  const outOfRange = amount < floor || amount > ceil;
  const total = useMemo(() => estimatedTotal(amount), [amount]);

  // 호가 사다리 = 상한(+10호가)에서 최소 입찰가까지 1호가 간격으로 내려오는 가격들.
  const rungs = useMemo(() => {
    const list: number[] = [];
    for (let p = ceil; p >= floor; p -= BID_MIN_INCREMENT) list.push(p);
    return list;
  }, [floor, ceil]);

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
      setMessage(null);
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

  function selectRung(price: number) {
    amountTouchedRef.current = true;
    setAmount(price);
  }

  function scrollToBid() {
    priceHeaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
      // 내 입찰 성공 시 다음 최소 입찰가로 즉시 올려둔다. rebase 효과에만 맡기면, 서버가 커밋
      // 직후 쏘는 SSE가 POST 응답보다 먼저 도착해 currentPrice를 갱신할 때 amountTouchedRef가
      // 아직 true라 스킵되고, 이후 값이 안 바뀌어 재실행도 안 돼 옛 입찰가에 갇히는 레이스가 있다.
      amountTouchedRef.current = false;
      setAmount(minNextBid(res.currentPrice, res.bidCount));
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
      {/* 현재가 헤더 */}
      <div
        ref={priceHeaderRef}
        className={`rounded-r3 border border-border p-4 shadow-card ${isLive ? "bg-primary-soft" : "bg-surface"}`}
      >
        <div className="flex items-center justify-between text-xs font-semibold text-text-3">
          <span>현재가</span>
          <span>입찰 {bidCount}회</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="font-display text-3xl font-extrabold text-text-1 tabular-nums" aria-live="polite">
            {formatKRW(currentPrice)}
          </span>
          <span
            className={`shrink-0 text-right text-sm font-bold tabular-nums ${isLive ? "text-accent" : "text-text-3"}`}
          >
            {isLive ? formatCountdown(endAt) : (STATUS_LABEL[status] ?? "종료")}
            {isLive && <span className="block text-[10px] font-normal text-text-3">마감까지</span>}
          </span>
        </div>
        {isLive && (
          <p className="mt-2 text-[10.5px] text-text-3">
            마감 3분 전 입찰 시 종료 시간이 자동 연장돼요(최대 3회).
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
      </div>

      {/* 입찰 영역 (진행 중일 때만) */}
      {isLive &&
        (isOwnAuction ? (
          <div className="mt-4 rounded-r2 border border-border bg-surface-2 p-4 text-center text-sm font-semibold text-text-2">
            내 경매입니다. 직접 입찰할 수 없어요.
          </div>
        ) : !accessToken ? (
          <Link
            href={`/login?redirect=/auctions/${auctionId}`}
            className={`mt-4 flex h-11 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
          >
            로그인하고 입찰하기
          </Link>
        ) : (
          <div className="mt-4">
            {/* 입찰 호가 — 현재가가 맨 아래, 위로 갈수록 높은 호가(최대 10호가 상한) */}
            <div className="overflow-hidden rounded-r2 border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5 text-sm font-extrabold text-text-1">
                <span>입찰 호가</span>
                <span className="text-[11px] font-semibold text-text-3">현재가부터 상위 10호가</span>
              </div>
              <div role="group" aria-label="입찰가 선택">
                {rungs.map((p, i) => {
                  const selected = p === amount;
                  const isNextBid = i === rungs.length - 1;
                  const tag = isNextBid ? "다음 호가" : `${rungs.length - i}호가`;
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectRung(p)}
                      className={`flex w-full items-center justify-between px-3.5 py-1.5 text-sm tabular-nums transition-colors ${FOCUS_RING} ${
                        selected ? "bg-accent-soft font-bold text-accent" : "text-text-2 hover:bg-surface-2"
                      }`}
                    >
                      <span>{formatKRW(p)}</span>
                      <span className={`text-[10px] font-semibold ${selected ? "text-accent" : "text-text-3"}`}>
                        {tag}
                      </span>
                    </button>
                  );
                })}
                {/* 현재가 행 — 사다리 맨 아래 */}
                <div className="flex items-center justify-between bg-primary-soft px-3.5 py-2.5 text-[15px] font-extrabold tabular-nums text-primary">
                  <span>현재가 {formatKRW(currentPrice)}</span>
                  <span className="text-xs font-bold">{bids[0]?.bidderNicknameMasked ?? "-"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border px-3.5 py-2 text-[11px] text-text-3">
                <span>입찰 단위 {formatKRW(BID_MIN_INCREMENT)}</span>
                <span>실시간 갱신 · SSE</span>
              </div>
            </div>

            {/* 선택 요약 + 예상 결제 총액 */}
            <div className="mt-3 rounded-r2 bg-surface-2 p-3 text-xs">
              <div className="flex items-center justify-between text-text-3">
                <span>입찰가</span>
                <span className="font-semibold text-text-2 tabular-nums">{formatKRW(amount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-text-3">
                <span>구매자 수수료</span>
                <span className="font-semibold text-text-2 tabular-nums">{formatKRW(buyerFee(amount))}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold text-text-2">예상 결제 총액</span>
                <span className="font-display text-sm font-extrabold text-primary tabular-nums">
                  {formatKRW(total)}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-text-3">낙찰 시 예상 금액이며 실제 청구액과 다를 수 있습니다.</p>
            </div>

            <button
              type="button"
              onClick={handleBid}
              disabled={submitting || outOfRange}
              className={`mt-2 flex h-11 w-full items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
            >
              {submitting ? "처리 중..." : `${formatKRW(amount)} 입찰하기`}
            </button>

            {outOfRange && (
              <p className="mt-1 text-[11px] font-semibold text-accent">
                입찰 가능 범위 {formatKRW(floor)} ~ {formatKRW(ceil)}
              </p>
            )}

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
          </div>
        ))}

      {/* 입찰 이력 */}
      <section className="mt-6 rounded-r3 border border-border bg-surface p-4 shadow-card">
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
          <ul className="mt-2 flex flex-col gap-1">
            {bids.map((bid, index) => (
              <li
                key={bid.id}
                className={`flex items-center justify-between rounded-r1 px-3 py-2 text-xs ${
                  index === 0 ? "bg-ok-soft" : "bg-surface-2"
                }`}
              >
                <span className={`font-semibold ${index === 0 ? "text-ok" : "text-text-2"}`}>
                  {index === 0 && (
                    <span className="mr-1.5 rounded-full bg-ok px-1.5 py-0.5 text-[10px] font-bold text-white">
                      최고가
                    </span>
                  )}
                  {bid.bidderNicknameMasked}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-bold text-text-1 tabular-nums">{formatKRW(bid.amount)}</span>
                  <span className="text-[10px] text-text-3">{formatRelativeTime(bid.createdAt)}</span>
                </span>
              </li>
            ))}
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
              <span className="truncate text-[11px] font-bold text-accent tabular-nums">
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
