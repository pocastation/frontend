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
  /** 이번 세션에 내가 낸 제안 금액 — 없으면 아직(또는 새로고침 뒤라) 모른다. */
  myOfferAmount: number | null;
  /**
   * 제안 전송. 결과를 돌려주는 이유는 <b>바텀시트가 자기를 닫을 타이밍</b>을 알아야 해서다(#453).
   * "placed" = 제안 완료(시트를 닫는다), "gate" = 배송지 등록 모달로 빠짐(시트를 닫아야
   * 모달이 보인다 — 모달 z-400 < 시트 z-500), "failed" = 오류(시트를 유지해 재시도).
   */
  handleBid: () => Promise<"placed" | "gate" | "failed">;
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
  // 🔴 「제안했다」가 아니라 **지금 낸 금액**을 기억한다(#428). 다시 제안하는 것이 곧 수정이라
  // (§2.1), 바꾸려는 사람에게 필요한 정보는 「보냈다」가 아니라 「얼마로 보냈나」다.
  //
  // ⚠️ 이번 세션에 제안한 경우에만 안다 — 상세 응답이 내 제안을 싣지 않아 새로고침하면
  // 잊는다. 그래서 이 값은 안내를 **더할 때만** 쓰고, 버튼을 잠그는 데는 쓰지 않는다.
  const [myOfferAmount, setMyOfferAmount] = useState<number | null>(null);
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

  const handleBid = useCallback(async (): Promise<"placed" | "gate" | "failed"> => {
    // 배송지가 없으면 제안을 보내지 않고 등록부터 받는다(#283). 서버도 같은 조건으로 막지만,
    // 여기서 잡아야 사용자가 오류 대신 다음 행동을 본다.
    if (needsAddress) {
      setAddressModalOpen(true);
      return "gate";
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth<BidResponse>(`/api/auctions/${auctionId}/bids`, {
        method: "POST",
        body: { amount },
      });
      setEndAt(res.endAt);
      setMyOfferAmount(amount);
      // 인원수는 SSE로도 오지만, 내 제안 직후만큼은 즉시 반영돼야 「보냈는데 안 늘었다」로 보이지 않는다.
      setOfferCount((prev) => (prev === 0 ? 1 : prev));
      // 🔴 부연을 붙인다(#404). 구매자가 제안 직후 「이제 뭘 기다리면 되나」를 아는 유일한
      // 문장이다 — 자동 낙찰이던 시절엔 「마감까지 기다린다」가 자명했지만 이제 아니고,
      // 마감을 화면에 표시하지 않기로 하면서 더 중요해졌다.
      toast.show({
        variant: "success",
        text: myOfferAmount == null ? "가격 제안을 보냈어요." : "제안 금액을 바꿨어요.",
        sub:
          myOfferAmount == null
            ? "판매자가 제안을 확인하고 거래 상대를 선택해요."
            : "이전 제안을 대신해요. 판매자에게는 바뀐 금액만 보여요.",
      });
    } catch (err) {
      const text = err instanceof ApiError ? err.message : "가격 제안에 실패했습니다. 잠시 후 다시 시도해주세요.";
      // 서버 관문 거부 — 화면 상태가 낡았다는 뜻이다(다른 탭에서 배송지를 지웠거나 조회가 실패했다).
      // 오류 토스트 대신 등록 모달로 이어 붙인다.
      if (isGateRejection(err)) {
        setAddressModalOpen(true);
        return "gate";
      }
      toast.show({ variant: "danger", text });
      return "failed";
    } finally {
      setSubmitting(false);
    }
    return "placed";
  // 🔴 myOfferAmount가 의존성에 있어야 한다 — 토스트 문구가 그 값을 읽는데 빠뜨리면 콜백이
  // 옛 값(null)을 잡은 채 굳어, **두 번째 제안에도 「보냈어요」가 뜬다.**
  }, [amount, auctionId, fetchWithAuth, isGateRejection, myOfferAmount, needsAddress, toast]);

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
      myOfferAmount,
      handleBid,
      needsAddress,
      addressModalOpen,
      openAddressModal: () => setAddressModalOpen(true),
      closeAddressModal: () => setAddressModalOpen(false),
      onAddressSaved,
    }),
    [
      auctionId, offerCount, wishlistCount, endAt, status, isLive, endingSoon, isOwnAuction,
      amount, floor, outOfRange, adjustAmount, submitting, myOfferAmount, handleBid,
      needsAddress, addressModalOpen, onAddressSaved,
    ],
  );

  return <AuctionBiddingContext.Provider value={value}>{children}</AuctionBiddingContext.Provider>;
}
