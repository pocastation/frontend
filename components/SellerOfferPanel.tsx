"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OfferCounts from "@/components/OfferCounts";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAuctionBidding } from "@/lib/auction-bidding-context";
import { PAYMENT_WINDOW_TEXT, sellerPayout } from "@/lib/fees";
import { formatKRW, formatRelativeTime } from "@/lib/format";
import { useToast } from "@/lib/toast-context";
import { FOCUS_RING } from "@/lib/ui";
import type {
  AuctionStatus,
  BidHistoryItem,
  BidListResponse,
  OfferSelectionResponse,
} from "@/lib/types";

type Props = {
  startPrice: number;
  offerCount: number;
  wishlistCount: number;
  status: AuctionStatus;
  viewport: "desktop" | "mobile";
};

function offerTime(iso: string): string {
  const relative = formatRelativeTime(iso);
  return relative === "방금" ? "방금 전" : relative;
}

function OfferConfirmation({
  offer,
  submitting,
  onCancel,
  onConfirm,
}: {
  offer: BidHistoryItem;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, submitting]);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center px-4" role="presentation">
      <button
        type="button"
        aria-label="확인 창 닫기"
        disabled={submitting}
        onClick={onCancel}
        className="absolute inset-0 bg-text-1/55"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-confirm-title"
        className="relative w-full max-w-[440px] rounded-r3 border border-border bg-white p-5 shadow-modal sm:p-6"
      >
        <button
          type="button"
          aria-label="닫기"
          disabled={submitting}
          onClick={onCancel}
          className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-r2 text-text-3 transition-colors hover:text-text-1 disabled:opacity-50 ${FOCUS_RING}`}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>

        {/* 🔴 제목이 「누구와」를 말한다(#424) — 고르는 대상이 금액이 아니라 **사람**이라는 것이
            이 개편의 서사이고, 제목이 그걸 먼저 말해야 한다. */}
        <h2 id="offer-confirm-title" className="pr-9 font-display text-[19px] font-extrabold leading-snug text-text-1">
          {offer.bidderNicknameMasked} 님의 제안을 선택할까요?
        </h2>

        {/* 🔴 「되돌릴 수 없다」가 제목 다음 첫 문장이다(#424). 예전에는 맨 아래 12px 회색이었고,
            그 위에는 「수락하면 **판매가 종료되고**」라는 사실이 아닌 문장이 있었다 — 매물은
            MATCHED로 가고 미결제면 다시 열린다(§1.4).
            강조 장치를 쓰지 않는다: 색 띠나 회색 상자는 알림 상자처럼 읽히고, 작은 팝업에서는
            그 자체가 장식이 된다. **읽는 순서**가 무게를 진다. */}
        <p className="mt-2.5 text-[13.5px] font-bold leading-relaxed text-text-1">
          선택하면 매매계약이 성립하고 되돌릴 수 없어요.
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-3">
          사정이 생기면 관리자 중재를 거쳐야 하고, 제재가 적용될 수 있어요.
        </p>

        {/* 금액 블록 — 채운 상자 대신 헤어라인 분할. 결정 직전에 실수령액과 상대 이력을 한 번 더
            보여준다: 목록에서 봤더라도 되돌릴 수 없는 버튼을 누르기 직전이 확인할 자리다. */}
        <div className="mt-5 border-t border-border pt-4">
          <p className="font-display text-3xl font-extrabold tabular-nums leading-none text-text-1">
            {formatKRW(offer.amount)}
          </p>
          <p className="mt-1.5 text-xs text-text-2">
            정산 예상 <b className="font-bold tabular-nums text-text-1">{formatKRW(sellerPayout(offer.amount))}</b>
            {" · 수수료 3.5% 공제"}
          </p>
          <div className="mt-3 border-t border-border pt-2.5">
            <p className="text-[12.5px] font-bold text-text-1">{offer.bidderNicknameMasked}</p>
            <p className="mt-0.5 text-[11.5px] text-text-2">
              Lv.{offer.trustLevel} · 거래 <span className="tabular-nums">{offer.tradeCount}회</span>
            </p>
          </div>
        </div>

        <p className="mt-4 border-t border-border pt-3 text-[11.5px] leading-relaxed text-text-3">
          선택하면 구매자에게{" "}
          <b className="font-bold text-text-2">{PAYMENT_WINDOW_TEXT} 안에 결제</b>하라는 안내가 갑니다.
          그동안 다른 제안은 받지 않고, 결제가 확인되면 발송을 준비하시면 돼요.
          기한이 지나면 다시 판매 중으로 돌아옵니다.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className={`h-[46px] w-[84px] shrink-0 rounded-r1 border border-border-2 bg-white text-[13.5px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-50 ${FOCUS_RING}`}
          >
            취소
          </button>
          <button
            type="button"
            autoFocus
            disabled={submitting}
            onClick={onConfirm}
            className={`h-[46px] flex-1 rounded-r1 bg-primary text-[13.5px] font-extrabold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
          >
            {submitting ? "처리 중..." : "이 제안 선택"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function SellerOfferPanel({
  startPrice,
  offerCount,
  wishlistCount,
  status,
  viewport,
}: Props) {
  const router = useRouter();
  const { fetchWithAuth } = useAuth();
  const { auctionId } = useAuctionBidding();
  const toast = useToast();
  const [activeViewport, setActiveViewport] = useState(false);
  const [offers, setOffers] = useState<BidHistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(offerCount);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<OfferSelectionResponse | null>(null);
  const [pendingOffer, setPendingOffer] = useState<BidHistoryItem | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setActiveViewport(viewport === "desktop" ? media.matches : !media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [viewport]);

  const loadOffers = useCallback(async (nextPage: number) => {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await fetchWithAuth<BidListResponse>(
        `/api/auctions/${auctionId}/bids?page=${nextPage}&size=20`,
        { cache: "no-store" },
      );
      setOffers(result.content);
      setPage(result.page);
      setTotalElements(result.totalElements);
      setTotalPages(Math.max(result.totalPages, 1));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [auctionId, fetchWithAuth]);

  const loadSelectedOffer = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await fetchWithAuth<OfferSelectionResponse>(
        `/api/auctions/${auctionId}/offers/selected`,
        { cache: "no-store" },
      );
      setSelectedOffer(result);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [auctionId, fetchWithAuth]);

  useEffect(() => {
    if (!activeViewport) return;
    if (selectedOffer) return;
    if (status === "MATCHED") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 활성 뷰포트가 정해진 뒤 판매자 전용 원격 상태를 조회한다.
      void loadSelectedOffer();
      return;
    }
    if (status === "LIVE") void loadOffers(0);
  }, [activeViewport, loadOffers, loadSelectedOffer, selectedOffer, status]);

  const isMatched = status === "MATCHED" || selectedOffer != null;
  const displayedCount = loading && offers.length === 0 ? offerCount : totalElements;
  const panelPadding = viewport === "desktop" ? "p-5" : "p-3.5";
  const amountLabel = isMatched ? "거래 성사 금액" : "판매자 최소 제안 금액";
  const displayAmount = isMatched ? selectedOffer?.amount : startPrice;

  async function acceptOffer() {
    if (!pendingOffer || accepting) return;
    setAccepting(true);
    try {
      const result = await fetchWithAuth<OfferSelectionResponse>(
        `/api/auctions/${auctionId}/offers/${pendingOffer.id}/accept`,
        { method: "POST" },
      );
      setSelectedOffer(result);
      setPendingOffer(null);
      toast.show({
        variant: "success",
        text: "제안을 선택했어요.",
        sub: "구매자에게 결제 안내가 발송됐어요.",
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : "제안을 선택하지 못했습니다. 잠시 후 다시 시도해주세요.";
      toast.show({ variant: "danger", text: message });
      if (error instanceof ApiError && ["BID_NOT_ACTIVE", "OFFER_NOT_FOUND"].includes(error.errorCode ?? "")) {
        setPendingOffer(null);
        void loadOffers(page);
      }
    } finally {
      setAccepting(false);
    }
  }

  return (
    <>
      <section
        id={viewport === "mobile" ? "seller-offer-list-mobile" : undefined}
        className={`rounded-r3 border border-border bg-surface ${panelPadding}`}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold text-text-3">{amountLabel}</p>
          <OfferCounts offerCount={offerCount} wishlistCount={wishlistCount} size={viewport === "desktop" ? "md" : "sm"} />
        </div>
        <p className={`${viewport === "desktop" ? "mt-1.5 text-3xl" : "mt-1 text-2xl"} font-display font-extrabold tabular-nums text-text-1`}>
          {displayAmount == null ? "금액 확인 중" : formatKRW(displayAmount)}
        </p>

        {isMatched ? (
          <div className={`${viewport === "desktop" ? "mt-5 pt-5" : "mt-4 pt-3.5"} border-t border-border`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={`${viewport === "desktop" ? "text-base" : "text-sm"} font-extrabold text-text-1`}>
                선택한 가격 제안
              </h2>
              {/* 🔴 테두리 칩을 걷었다(#424). 마이페이지 목록에서 같은 모양(도트 배지·알약)을
                  이미 걷어냈는데 여기만 남아 있었다 — 상태는 텍스트가 말하고, 칩은 조작
                  가능한 것처럼 읽힌다. 오른쪽 끝 잉크색 굵은 글씨가 목록의 상태 열과 같은 규칙이다. */}
              <span className="shrink-0 text-[11.5px] font-bold text-text-1">결제 대기</span>
            </div>

            {loading && !selectedOffer ? (
              <p className="border-b border-border py-6 text-center text-sm text-text-3">선택한 제안을 불러오는 중...</p>
            ) : loadError || !selectedOffer ? (
              <div className="border-b border-border py-5 text-center">
                <p className="text-sm text-text-3">선택한 제안을 불러오지 못했어요.</p>
                <button type="button" onClick={() => void loadSelectedOffer()} className={`mt-2 text-xs font-bold text-primary ${FOCUS_RING}`}>
                  다시 시도
                </button>
              </div>
            ) : (
              <dl className="mt-3 divide-y divide-border border-y border-border text-sm">
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-text-3">구매자</dt>
                  <dd className="font-bold text-text-1">{selectedOffer.buyerNicknameMasked}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-text-3">거래 금액</dt>
                  <dd className="font-display text-base font-extrabold tabular-nums text-text-1">
                    {formatKRW(selectedOffer.amount)}
                  </dd>
                </div>
                {/* 🔴 응답으로 받고 있는데 화면이 쓰지 않던 값이다(#424). 마이페이지·발송 패널은
                    이미 「정산 예정」을 보여주는데 이 화면만 빠져 있었다 — 판매자가 실제로 받는
                    돈이 어디에도 없었다. */}
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-text-3">정산 예상</dt>
                  <dd className="font-bold tabular-nums text-text-1">
                    {formatKRW(selectedOffer.payoutAmount)}
                  </dd>
                </div>
              </dl>
            )}

            <p className="mt-4 text-[12.5px] font-semibold leading-relaxed text-text-2">
              구매자가 결제를 완료하면 발송 안내를 받을 수 있어요.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-3">
              결제 기한 내 미결제 시 판매가 다시 진행 중 상태로 돌아가요.
            </p>
          </div>
        ) : (
          <div className={`${viewport === "desktop" ? "mt-5 pt-5" : "mt-4 pt-3.5"} border-t border-border`}>
            <div className="flex items-center justify-between gap-3 pb-3">
              <h2 className={`${viewport === "desktop" ? "text-base" : "text-sm"} font-extrabold text-text-1`}>
                받은 가격 제안 {displayedCount}건
              </h2>
              <span className="text-[11px] text-text-3">최신순</span>
            </div>

            {loading && offers.length === 0 ? (
              <p className="border-y border-border py-6 text-center text-sm text-text-3">제안 목록을 불러오는 중...</p>
            ) : loadError ? (
              <div className="border-y border-border py-5 text-center">
                <p className="text-sm text-text-3">제안 목록을 불러오지 못했어요.</p>
                <button type="button" onClick={() => void loadOffers(page)} className={`mt-2 text-xs font-bold text-primary ${FOCUS_RING}`}>
                  다시 시도
                </button>
              </div>
            ) : offers.length === 0 ? (
              <p className="border-y border-border py-6 text-center text-sm font-semibold text-text-3">
                아직 받은 가격 제안이 없어요.
              </p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {offers.map((offer) => (
                  // 🔴 금액을 닉네임과 **같은 급**으로 낮췄다(#424). 예전에는 금액이 15px/800,
                  // 닉네임이 14px/700이라 시선이 금액으로 먼저 갔다 — 금액을 키우면 화면이 여전히
                  // 경매로 읽히고, PG 심사자도 이 화면을 본다.
                  //
                  // 그 아래 한 줄이 **상대를 심사할 재료**다(§2.8 C1, BE #378). 칩이나 배지로
                  // 흩지 않고 가운뎃점으로 이어 숫자만 굵게 둔다 — 훑을 때 숫자가 걸린다.
                  <li key={offer.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 py-3">
                    <span className="truncate text-[13.5px] font-bold text-text-1">
                      {offer.bidderNicknameMasked}
                    </span>
                    <span className="text-right font-display text-[13.5px] font-bold tabular-nums text-text-1">
                      {formatKRW(offer.amount)}
                    </span>
                    <span className="col-start-1 truncate text-[11.5px] text-text-2">
                      Lv.{offer.trustLevel} · 거래{" "}
                      <b className="font-bold tabular-nums text-text-1">{offer.tradeCount}회</b>
                      {" · "}
                      <span className="text-text-3">{offerTime(offer.createdAt)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingOffer(offer)}
                      className={`col-start-2 h-8 justify-self-end rounded-r1 border border-border-2 bg-white px-3 text-xs font-bold text-text-1 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
                    >
                      선택
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {totalPages > 1 && !loadError && (
              <div className="mt-3 flex items-center justify-center gap-3 text-xs">
                <button type="button" disabled={page === 0 || loading} onClick={() => void loadOffers(page - 1)} className={`font-bold text-text-2 disabled:opacity-30 ${FOCUS_RING}`}>
                  이전
                </button>
                <span className="tabular-nums text-text-3">{page + 1} / {totalPages}</span>
                <button type="button" disabled={page + 1 >= totalPages || loading} onClick={() => void loadOffers(page + 1)} className={`font-bold text-text-2 disabled:opacity-30 ${FOCUS_RING}`}>
                  다음
                </button>
              </div>
            )}

            <p className="mt-4 text-[11px] leading-relaxed text-text-3">
              제안을 선택하면 구매자에게 결제 안내가 발송되며, 되돌릴 수 없어요.
            </p>
          </div>
        )}
      </section>

      {pendingOffer && (
        <OfferConfirmation
          offer={pendingOffer}
          submitting={accepting}
          onCancel={() => {
            if (!accepting) setPendingOffer(null);
          }}
          onConfirm={() => void acceptOffer()}
        />
      )}
    </>
  );
}
