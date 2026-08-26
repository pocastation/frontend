"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiFetch, ApiError, apiStreamUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useDeliveryAddressGate } from "@/lib/use-delivery-address-gate";
import { useToast } from "@/lib/toast-context";
import { isBeforeEnd, isEndingSoon } from "@/lib/format";
import type { AuctionStatus, BidHistoryItem, BidListResponse, BidResponse, BidStreamEvent } from "@/lib/types";

/**
 * 상세의 가격 제안 상태 — **한 화면에 하나만 띄운다.**
 *
 * <p>모바일과 데스크탑은 지면이 달라 컴포넌트를 따로 두지만, 제안은 그렇게 나눌 수 없다.
 * 각자 상태를 가지면 **EventSource가 두 개** 열리고(상세를 볼 때마다 서버 연결이 두 배),
 * 두 화면의 현재가가 서로 다른 순간이 생긴다. 그래서 로직은 이 컨텍스트 하나이고,
 * `BidSection`(데스크탑)과 `MobileAuctionDetail`은 같은 값을 읽어 각자 그리기만 한다.
 *
 * <p>여기 담긴 것: 현재가·제안수·마감시각(SSE 반영) · 제안 내역 · 제안가 스테퍼 · 제안 요청 ·
 * 배송지 관문 · 최고가 제안자 여부.
 */

type AuctionBiddingValue = {
  auctionId: number;
  currentPrice: number;
  bidCount: number;
  wishlistCount: number;
  endAt: string;
  status: AuctionStatus;
  isLive: boolean;
  endingSoon: boolean;
  isOwnAuction: boolean;
  bids: BidHistoryItem[];
  hasMoreBids: boolean;
  loadMoreBids: () => Promise<void>;
  amount: number;
  adjustAmount: (next: number) => void;
  submitting: boolean;
  isTopBidder: boolean;
  handleBid: () => Promise<void>;
  needsAddress: boolean;
  addressModalOpen: boolean;
  openAddressModal: () => void;
  closeAddressModal: () => void;
  onAddressSaved: (afterSave?: () => void) => void;
};

const AuctionBiddingContext = createContext<AuctionBiddingValue | null>(null);

export function useAuctionBidding(): AuctionBiddingValue {
  const value = useContext(AuctionBiddingContext);
  if (!value) throw new Error("useAuctionBidding은 AuctionBiddingProvider 안에서만 쓸 수 있습니다.");
  return value;
}

export function AuctionBiddingProvider({
  auctionId,
  initialCurrentPrice,
  minimumPrice,
  initialBidCount,
  initialEndAt,
  status,
  sellerNickname,
  children,
}: {
  auctionId: number;
  initialCurrentPrice: number;
  minimumPrice: number;
  initialBidCount: number;
  initialEndAt: string;
  status: AuctionStatus;
  sellerNickname: string;
  children: ReactNode;
}) {
  const { member, fetchWithAuth } = useAuth();
  const toast = useToast();
  // 배송지 관문(#283) — 없으면 CTA 라벨이 바뀌고 누를 때 등록 모달이 뜬다.
  const { needsAddress, markRegistered, isGateRejection } = useDeliveryAddressGate();
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const [currentPrice, setCurrentPrice] = useState(initialCurrentPrice);
  const [bidCount, setBidCount] = useState(initialBidCount);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [endAt, setEndAt] = useState(initialEndAt);
  const [bids, setBids] = useState<BidHistoryItem[]>([]);
  const [bidPage, setBidPage] = useState(0);
  const [bidTotalPages, setBidTotalPages] = useState(1);
  const [amount, setAmount] = useState(minimumPrice);
  const [submitting, setSubmitting] = useState(false);
  // 내가 현재 최고가 제안자인지 — 내 제안 성공/서버 '이미 최고 입찰자' 응답으로 켜지고, 남이 추월(SSE)하면 꺼진다.
  const [isTopBidder, setIsTopBidder] = useState(false);
  const myTopBidRef = useRef<number | null>(null);
  // 카운트다운/상대시각을 1초마다 다시 그리기 위한 틱(값은 안 읽고 리렌더 트리거로만 쓴다).
  const [, setNowTick] = useState(0);
  const isLive = status === "LIVE" && isBeforeEnd(endAt);
  // 마감 임박일 때만 카운트다운을 주황(warn)으로 강조 — 그 외에는 뉴트럴로 둔다(색 절제).
  const endingSoon = isLive && isEndingSoon(endAt);
  const isOwnAuction = member?.nickname != null && member.nickname === sellerNickname;

  // 관심 수는 비로그인 구매자도 볼 수 있는 공개 집계값이다. 실패해도 가격 제안 흐름은 막지 않는다.
  useEffect(() => {
    let cancelled = false;
    apiFetch<number>(`/api/auctions/${auctionId}/wishlist/count`, { cache: "no-store" })
      .then((count) => {
        if (!cancelled) setWishlistCount(count);
      })
      .catch(() => {
        // 백엔드가 아직 집계를 지원하지 않는 환경에서는 0으로 조용히 유지한다.
      });
    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  // 최신 순으로 첫 페이지를 다시 받아 교체한다(제안 발생 시 authoritative하게 갱신).
  const fetchBids = useCallback(async () => {
    try {
      const res = await apiFetch<BidListResponse>(`/api/auctions/${auctionId}/bids?page=0&size=20`, {
        cache: "no-store",
      });
      setBids(res.content);
      setBidPage(0);
      setBidTotalPages(res.totalPages);
    } catch {
      // 내역 조회 실패는 제안 흐름을 막지 않는다(가격/카운트다운은 SSE로 계속 갱신).
    }
  }, [auctionId]);

  // "더보기" — 다음 페이지를 이어 붙인다. 그 사이 새 제안이 들어와도 이미 받은 앞쪽 페이지와
  // 겹치지 않게, 첫 페이지 교체(fetchBids)와는 분리된 흐름으로 둔다.
  const loadMoreBids = useCallback(async () => {
    const nextPage = bidPage + 1;
    try {
      const res = await apiFetch<BidListResponse>(`/api/auctions/${auctionId}/bids?page=${nextPage}&size=20`, {
        cache: "no-store",
      });
      setBids((prev) => [...prev, ...res.content]);
      setBidPage(nextPage);
      setBidTotalPages(res.totalPages);
    } catch {
      // 실패해도 이미 보이는 내역은 유지한다.
    }
  }, [auctionId, bidPage]);

  // 초기 제안 내역 로드.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 서버에서 제안 내역 1회 로드(동기 setState 아님, await 후 갱신)
    fetchBids();
  }, [fetchBids]);

  // 실시간 가격 구독(공개 SSE) — 새 제안이 오면 가격/제안수/마감시각을 즉시 반영하고
  // 내역은 재조회로 authoritative하게 갱신한다. 종료된 매물은 구독하지 않는다.
  useEffect(() => {
    if (status !== "LIVE") return;

    const source = new EventSource(apiStreamUrl(`/api/auctions/${auctionId}/bids/stream`));
    source.addEventListener("bid", (e) => {
      const data: BidStreamEvent = JSON.parse((e as MessageEvent).data);
      setCurrentPrice(data.currentPrice);
      setBidCount(data.bidCount);
      setEndAt(data.endAt);
      // 내 최고가보다 높은 제안이 들어오면 추월된 것 — 내 SSE 에코(같은 금액)는 무시한다.
      if (myTopBidRef.current != null && data.currentPrice > myTopBidRef.current) {
        myTopBidRef.current = null;
        setIsTopBidder(false);
      }
      fetchBids();
    });
    source.onerror = () => {};

    return () => source.close();
  }, [auctionId, status, fetchBids]);

  // 라이브 카운트다운/상대시각을 1초마다 갱신. 종료된 매물은 틱 불필요.
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  // 공개되지 않는 현재가와 무관하게 판매자가 정한 최소 금액만 하한으로 사용한다.
  const adjustAmount = useCallback(
    (next: number) => {
      setAmount(Math.max(minimumPrice, next));
    },
    [minimumPrice],
  );

  const handleBid = useCallback(async () => {
    // 배송지가 없으면 제안을 보내지 않고 등록부터 받는다(#283). 서버도 같은 조건으로 막지만,
    // 여기서 잡아야 사용자가 오류 대신 다음 행동을 본다.
    if (needsAddress) {
      setAddressModalOpen(true);
      return;
    }
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
      toast.show({ variant: "success", text: "가격 제안을 보냈어요." });
      fetchBids();
    } catch (err) {
      const text = err instanceof ApiError ? err.message : "가격 제안에 실패했습니다. 잠시 후 다시 시도해주세요.";
      // 서버 관문 거부 — 화면 상태가 낡았다는 뜻이다(다른 탭에서 배송지를 지웠거나 조회가 실패했다).
      // 오류 토스트 대신 등록 모달로 이어 붙인다.
      if (isGateRejection(err)) {
        setAddressModalOpen(true);
      } else if (err instanceof ApiError && err.errorCode === "ALREADY_HIGHEST_BIDDER") {
        // '이미 최고가 제안자'는 에러가 아니라 정상 상태 — 정보 톤으로 안내하고 버튼도 잠근다.
        //
        // **문구가 아니라 에러 코드로 판별한다.** 전에는 `err.message.includes("최고 입찰")`이라
        // 서버가 문구를 한 글자만 바꿔도 이 분기가 조용히 죽어 정상 상태가 빨간 에러로 보였다.
        // 코드는 계약이고 문구는 카피다 — 카피에 로직을 걸지 않는다.
        setIsTopBidder(true);
        toast.show({
          variant: "info",
          text: "현재 가격으로는 다시 제안할 수 없어요.",
          sub: "금액을 확인한 뒤 다시 시도해주세요.",
        });
      } else {
        toast.show({ variant: "danger", text });
      }
    } finally {
      setSubmitting(false);
    }
  }, [amount, auctionId, fetchBids, fetchWithAuth, isGateRejection, needsAddress, toast]);

  const onAddressSaved = useCallback(
    (afterSave?: () => void) => {
      setAddressModalOpen(false);
      markRegistered();
      toast.show({ variant: "success", text: "배송지를 등록했어요.", sub: "이제 제안할 수 있어요." });
      afterSave?.();
    },
    [markRegistered, toast],
  );

  const value = useMemo<AuctionBiddingValue>(
    () => ({
      auctionId,
      currentPrice,
      bidCount,
      wishlistCount,
      endAt,
      status,
      isLive,
      endingSoon,
      isOwnAuction,
      bids,
      hasMoreBids: bidPage + 1 < bidTotalPages,
      loadMoreBids,
      amount,
      adjustAmount,
      submitting,
      isTopBidder,
      handleBid,
      needsAddress,
      addressModalOpen,
      openAddressModal: () => setAddressModalOpen(true),
      closeAddressModal: () => setAddressModalOpen(false),
      onAddressSaved,
    }),
    [
      auctionId, currentPrice, bidCount, wishlistCount, endAt, status, isLive, endingSoon, isOwnAuction,
      bids, bidPage, bidTotalPages, loadMoreBids, amount, adjustAmount,
      submitting, isTopBidder, handleBid, needsAddress, addressModalOpen, onAddressSaved,
    ],
  );

  return <AuctionBiddingContext.Provider value={value}>{children}</AuctionBiddingContext.Provider>;
}
