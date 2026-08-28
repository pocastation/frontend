"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OfferCounts from "@/components/OfferCounts";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAuctionBidding } from "@/lib/auction-bidding-context";
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

        <h2 id="offer-confirm-title" className="pr-9 font-display text-xl font-extrabold text-text-1">
          이 제안을 수락할까요?
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-text-3">
          수락하면 판매가 종료되고 구매자에게 결제 안내가 발송돼요.
        </p>

        <dl className="mt-5 bg-surface-2 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-4 py-1">
            <dt className="text-text-3">구매자</dt>
            <dd className="font-bold text-text-1">{offer.bidderNicknameMasked}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-1">
            <dt className="text-text-3">제안 금액</dt>
            <dd className="font-display text-base font-extrabold tabular-nums text-text-1">
              {formatKRW(offer.amount)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-[12px] leading-relaxed text-text-3">
          수락한 제안은 변경하거나 취소할 수 없어요.
        </p>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className={`h-11 rounded-r2 border border-border-2 bg-white px-5 text-sm font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-50 ${FOCUS_RING}`}
          >
            취소
          </button>
          <button
            type="button"
            autoFocus
            disabled={submitting}
            onClick={onConfirm}
            className={`h-11 rounded-r2 bg-primary px-5 text-sm font-extrabold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
          >
            {submitting ? "처리 중..." : "제안 수락"}
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
        text: "제안을 수락했어요.",
        sub: "구매자에게 결제 안내가 발송됐어요.",
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : "제안을 수락하지 못했습니다. 잠시 후 다시 시도해주세요.";
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
              <span className="rounded-r2 border border-border-2 px-2.5 py-1 text-[11px] font-bold text-text-2">
                결제 대기
              </span>
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
                  <li
                    key={offer.id}
                    className={viewport === "desktop"
                      ? "grid grid-cols-[minmax(0,1fr)_92px_112px_68px] items-center gap-3 py-3"
                      : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3"}
                  >
                    <span className="truncate text-sm font-bold text-text-1">{offer.bidderNicknameMasked}</span>
                    <span className={`${viewport === "desktop" ? "text-left" : "col-start-1 row-start-2"} text-[11px] text-text-3`}>
                      {offerTime(offer.createdAt)}
                    </span>
                    <span className={`${viewport === "desktop" ? "text-right" : "col-start-2 row-start-1"} font-display text-[15px] font-extrabold tabular-nums text-text-1`}>
                      {formatKRW(offer.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingOffer(offer)}
                      className={`${viewport === "desktop" ? "h-9" : "col-start-2 row-start-2 h-8"} rounded-r2 bg-primary px-3 text-xs font-extrabold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
                    >
                      수락
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
              제안을 수락하면 구매자에게 결제 안내가 발송되며, 선택을 되돌릴 수 없어요.
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
