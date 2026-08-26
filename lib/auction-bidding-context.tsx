"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, apiFetch, apiStreamUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useDeliveryAddressGate } from "@/lib/use-delivery-address-gate";
import { useToast } from "@/lib/toast-context";
import { isBeforeEnd, isEndingSoon } from "@/lib/format";
import { OFFER_UNIT } from "@/lib/fees";
import type { AuctionStatus, BidResponse, BidStreamEvent } from "@/lib/types";

/**
 * 상세의 가격 제안 상태 — **한 화면에 하나만 띄운다.**
 *
 * <p>모바일과 데스크탑은 지면이 달라 컴포넌트를 따로 두지만, 제안은 그렇게 나눌 수 없다.
 * 각자 상태를 가지면 **EventSource가 두 개** 열리고(상세를 볼 때마다 서버 연결이 두 배),
 * 두 화면의 값이 서로 다른 순간이 생긴다. 그래서 로직은 이 컨텍스트 하나이고,
 * `BidSection`(데스크탑)과 `MobileAuctionDetail`은 같은 값을 읽어 각자 그리기만 한다.
 *
 * <p>🔴 **거래 개편 §1.7로 여기서 다루던 것의 절반이 사라졌다.**
 * <ul>
 *   <li>현재가(=최고 제안가) — 응답에서 빠졌다. 구매자의 가격 기준점은 **최소가 하나**다</li>
 *   <li>제안 내역 — `GET /bids`가 **판매자 전용**이 됐다. 구매자가 부르면 403이다</li>
 *   <li>제안 가능 범위(하한·상한) — 현재가 기준이라 함께 폐기됐다(§2.3)</li>
 *   <li>추월 감지 — 아웃비드 알림과 함께 폐기됐다</li>
 * </ul>
 *
 * <p>남은 것: 제안 인원수(SSE 반영) · 마감시각 · 제안가 입력 · 제안 요청 · 배송지 관문.
 */

type AuctionBiddingValue = {
  auctionId: number;
  /** 취소를 뺀 distinct 제안자 수(§2.9). 제안 "건수"가 아니다 — 한 사람이 여러 번 내도 1이다. */
  offerCount: number;
  wishlistCount: number;
  endAt: string;
  status: AuctionStatus;
  isLive: boolean;
  endingSoon: boolean;
  isOwnAuction: boolean;
  amount: number;
  /** 제안 하한 = 최소가. 상한은 없다(§2.3). */
  floor: number;
  outOfRange: boolean;
  adjustAmount: (next: number) => void;
  submitting: boolean;
  /** 이 매물에 이미 유효한 제안을 냈다 — 서버가 중복 제안을 막는다. */
  alreadyOffered: boolean;
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
  startPrice,
  initialOfferCount,
  initialEndAt,
  status,
  sellerNickname,
  children,
}: {
  auctionId: number;
  startPrice: number;
  initialOfferCount: number;
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

  const [offerCount, setOfferCount] = useState(initialOfferCount);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [endAt, setEndAt] = useState(initialEndAt);
  // 제안가의 출발값은 최소가다. 예전에는 「현재가 + 1단위」였는데 그 현재가가 비공개가 됐다(§1.7).
  const [amount, setAmount] = useState(startPrice);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyOffered, setAlreadyOffered] = useState(false);
  // 카운트다운/상대시각을 1초마다 다시 그리기 위한 틱(값은 안 읽고 리렌더 트리거로만 쓴다).
  const [, setNowTick] = useState(0);
  const amountTouchedRef = useRef(false);

  const isLive = status === "LIVE" && isBeforeEnd(endAt);
  // 마감 임박일 때만 카운트다운을 주황(warn)으로 강조 — 그 외에는 뉴트럴로 둔다(색 절제).
  const endingSoon = isLive && isEndingSoon(endAt);
  const isOwnAuction = member?.nickname != null && member.nickname === sellerNickname;
  const floor = startPrice;
  // 상한이 없어졌으므로 범위 이탈은 「최소가 미만」과 「단위 어긋남」 둘뿐이다.
  const outOfRange = amount < floor || amount % OFFER_UNIT !== 0;

  // 관심 수는 로그인 여부와 무관한 공개 집계다. 실패해도 가격 제안 흐름은 막지 않는다.
  useEffect(() => {
    let cancelled = false;
    apiFetch<number>(`/api/auctions/${auctionId}/wishlist/count`, { cache: "no-store" })
      .then((count) => {
        if (!cancelled) setWishlistCount(count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  /**
   * 제안 인원수 실시간 구독(공개 SSE).
   *
   * 🔴 예전에는 이 이벤트로 현재가·마감시각·추월 여부까지 갱신했다. 인증 없이 구독할 수 있는
   * 경로라(EventSource는 Authorization 헤더를 실을 수 없다) 화면에서 지운 금액이 여기로
   * 그대로 새어나가고 있었다 — 지금 페이로드에는 인원수만 들어 있다.
   */
  useEffect(() => {
    if (status !== "LIVE") return;

    const source = new EventSource(apiStreamUrl(`/api/auctions/${auctionId}/bids/stream`));
    source.addEventListener("bid", (e) => {
      const data: BidStreamEvent = JSON.parse((e as MessageEvent).data);
      setOfferCount(data.offerCount);
    });
    source.onerror = () => {};

    return () => source.close();
  }, [auctionId, status]);

  // 라이브 카운트다운/상대시각을 1초마다 갱신. 종료된 매물은 틱 불필요.
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  // 제안가 조정(스테퍼 ± · 빠른 가산) — 최소가 아래로만 못 내려가게 클램프한다.
  // 상한 클램프가 없어진 것이 §2.3의 결과다: 최소가의 몇 배든 한 번에 제안할 수 있다.
  const adjustAmount = useCallback(
    (next: number) => {
      amountTouchedRef.current = true;
      setAmount(Math.max(floor, next));
    },
    [floor],
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
      setEndAt(res.endAt);
      setAlreadyOffered(true);
      // 인원수는 SSE로도 오지만, 내 제안 직후만큼은 즉시 반영돼야 「보냈는데 안 늘었다」로 보이지 않는다.
      setOfferCount((prev) => (prev === 0 ? 1 : prev));
      toast.show({
        variant: "success",
        text: "가격 제안을 보냈어요.",
      });
    } catch (err) {
      const text = err instanceof ApiError ? err.message : "가격 제안에 실패했습니다. 잠시 후 다시 시도해주세요.";
      // 서버 관문 거부 — 화면 상태가 낡았다는 뜻이다(다른 탭에서 배송지를 지웠거나 조회가 실패했다).
      // 오류 토스트 대신 등록 모달로 이어 붙인다.
      if (isGateRejection(err)) {
        setAddressModalOpen(true);
      } else if (err instanceof ApiError && err.errorCode === "ALREADY_HIGHEST_BIDDER") {
        // 🔴 문구가 남의 호가를 알려주면 안 된다(§1.7). 예전에는 「이미 회원님이 최고가
        // 제안자예요 · 더 높은 금액으로만 다시 제안할 수 있어요」였는데, 그건 **아무도 나보다
        // 높게 내지 않았다**는 사실을 그대로 알려주는 문장이다 — 화면에서 지운 정보를 에러
        // 문구로 흘리는 셈이다.
        //
        // ⚠️ 이 분기는 임시다. 제안 수정·취소(Stage 3)가 들어오면 중복 제안 차단 자체가
        // 「수정」으로 대체된다. 그전까지는 다시 제안할 수 없다는 사실만 담백하게 알린다.
        //
        // **문구가 아니라 에러 코드로 판별한다.** 전에는 `err.message.includes("최고 입찰")`이라
        // 서버가 문구를 한 글자만 바꿔도 이 분기가 조용히 죽었다. 코드는 계약이고 문구는 카피다.
        setAlreadyOffered(true);
        toast.show({
          variant: "info",
          text: "이미 이 매물에 제안하셨어요.",
          sub: "제안 수정은 곧 지원될 예정이에요.",
        });
      } else {
        toast.show({ variant: "danger", text });
      }
    } finally {
      setSubmitting(false);
    }
  }, [amount, auctionId, fetchWithAuth, isGateRejection, needsAddress, toast]);

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
      offerCount,
      wishlistCount,
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
      openAddressModal: () => setAddressModalOpen(true),
      closeAddressModal: () => setAddressModalOpen(false),
      onAddressSaved,
    }),
    [
      auctionId, offerCount, wishlistCount, endAt, status, isLive, endingSoon, isOwnAuction,
      amount, floor, outOfRange, adjustAmount, submitting, alreadyOffered, handleBid,
      needsAddress, addressModalOpen, onAddressSaved,
    ],
  );

  return <AuctionBiddingContext.Provider value={value}>{children}</AuctionBiddingContext.Provider>;
}
