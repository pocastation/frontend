"use client";

/**
 * 즉시판매 모바일 상세(#461, 시안 승인 2026-08-31).
 *
 * <p>🔴 예전에는 즉시판매가 모바일 전용 상세를 <b>아예 안 탔다</b> — 상세 페이지의
 * {@code biddable = !isInstantSale && …} 조건이 제안판매만 태워서, 데스크탑 레이아웃이
 * 375px에 그대로 구겨져 내려왔다. 풀블리드 갤러리도, 하단 고정 CTA도, 확인 단계도 없었다.
 *
 * <p>골격은 제안판매(MobileAuctionDetail)와 같다 — 갤러리·상태줄·칩·카드 하나·판매자 행·
 * 탭·하단 고정 바·바텀시트. 다른 것은 둘뿐이다: 가격 카드의 라벨(즉시판매가)과 시트의 성격
 * (제안 입력 → <b>구매 확인</b>).
 *
 * <p>🔴 <b>확인 시트가 핵심이다.</b> 즉시구매는 제안과 달리 누르는 순간 매매계약이 성립한다
 * (운영정책 제13조 ①) — 되돌릴 수 없는 행동 앞에는 「이 가격으로 바로 구매할까요?」 한 단계가
 * 있어야 한다. 판매자 선택 확인(#424)과 같은 서사: 「되돌릴 수 없다」가 제목 다음 첫 문장.
 *
 * <p>배송지 게이트는 제안 시트(#453)와 같은 문법이다 — 게이트로 빠질 때 시트를 닫아야
 * 모달(z-400)이 보이고, 저장이 끝나면 시트를 다시 열어 흐름을 잇는다.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuctionWishlistButton from "@/components/AuctionWishlistButton";
import DeliveryAddressGateModal from "@/components/DeliveryAddressGateModal";
import MobileDetailGallery from "@/components/mobile/MobileDetailGallery";
import { MobileDetailTabs, SellerRow } from "@/components/mobile/MobileDetailShared";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useDeliveryAddressGate } from "@/lib/use-delivery-address-gate";
import { buyerFee, estimatedTotal } from "@/lib/fees";
import { formatKRW } from "@/lib/format";
import { GRADE_LABEL, SOURCE_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionDetailResponse, AuctionPurchaseResponse, MyOrderStatusResponse } from "@/lib/types";

function ConfirmSheet({
  price,
  submitting,
  onConfirm,
  onClose,
}: {
  price: number;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[500] sm:hidden" role="dialog" aria-label="즉시구매 확인" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-text-1/40" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-r4 bg-white px-[14px] pb-[calc(16px_+_env(safe-area-inset-bottom))] pt-4">
        <p className="text-[15px] font-extrabold text-text-1">이 가격으로 바로 구매할까요?</p>
        <p className="mt-1 text-[11.5px] text-text-3">확정하면 거래가 성사되고 되돌릴 수 없어요.</p>

        <div className="mt-3.5 border-t border-border pt-3 text-[12.5px]">
          <div className="flex items-center justify-between">
            <span className="text-text-2">즉시판매가</span>
            <b className="font-bold tabular-nums text-text-1">{formatKRW(price)}</b>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-text-2">구매자 수수료</span>
            <b className="font-bold tabular-nums text-text-1">{formatKRW(buyerFee(price))}</b>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
            <b className="font-bold text-text-1">예상 결제 총액</b>
            <b className="font-bold tabular-nums text-[15px] text-text-1">{formatKRW(estimatedTotal(price))}</b>
          </div>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className={`mt-3.5 flex h-12 w-full items-center justify-center rounded-[7px] bg-primary text-sm font-extrabold text-white disabled:opacity-60 ${FOCUS_RING}`}
        >
          {submitting ? "처리 중..." : "즉시구매 확정"}
        </button>
        <p className="mt-2 text-[11px] text-text-3">확정 후 안내되는 가상계좌로 48시간 안에 입금하면 돼요.</p>
      </div>
    </div>
  );
}

export default function MobileInstantDetail({
  auction,
  actions,
}: {
  auction: AuctionDetailResponse;
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const { member, accessToken, fetchWithAuth } = useAuth();
  // 배송지 관문(#283) — 즉시구매는 누르는 즉시 거래가 성사돼 가격 제안보다 더 앞에서 잡는다.
  const { needsAddress, markRegistered, isGateRejection } = useDeliveryAddressGate();

  const [status, setStatus] = useState(auction.status);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  // MATCHED가 「내가 산 것」인지 「남이 산 것」인지 — 상세 응답에는 없어서 주문 상태 배치
  // API(구매 내역과 같은 경로)로 확인한다. 내 주문이면 바가 「결제하러 가기」로 바뀐다:
  // 「다른 구매자가 거래 진행 중」은 방금 산 본인에게는 틀린 말이다.
  const [isMyOrder, setIsMyOrder] = useState(false);

  const price = auction.buyNowPrice ?? auction.startPrice;
  const isLive = status === "LIVE";
  const isMatched = status === "MATCHED";
  const isOwnSale = member?.nickname != null && member.nickname === auction.sellerNickname;

  useEffect(() => {
    if (!accessToken || status !== "MATCHED") return;
    let cancelled = false;
    fetchWithAuth<MyOrderStatusResponse[]>(`/api/members/me/orders/status?auctionIds=${auction.id}`)
      .then((list) => {
        if (!cancelled && list.some((o) => o.auctionId === auction.id)) setIsMyOrder(true);
      })
      .catch(() => {}); // 못 알아내면 중립 안내로 남는다 — 틀린 단정보다 낫다.
    return () => {
      cancelled = true;
    };
  }, [accessToken, auction.id, fetchWithAuth, status]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<number>(`/api/auctions/${auction.id}/wishlist/count`, { cache: "no-store" })
      .then((count) => {
        if (!cancelled) setWishlistCount(count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [auction.id]);

  function openSheet() {
    // 배송지가 없으면 확인 시트 대신 등록부터(#283). 시트를 거치지 않으므로 닫을 것도 없다.
    if (needsAddress) {
      setAddressModalOpen(true);
      return;
    }
    setSheetOpen(true);
  }

  async function purchase() {
    setSubmitting(true);
    try {
      const res = await fetchWithAuth<AuctionPurchaseResponse>(`/api/auctions/${auction.id}/purchase`, {
        method: "POST",
      });
      setStatus(res.status);
      // 구매 성공 = 주문 생성이지 결제 완료가 아니다(A안). 결제 페이지로 곧바로 넘긴다 —
      // 여기서 멈추면 "구매했는데 돈 낼 곳이 없는" 상태로 보인다(FE #333).
      router.push(`/orders/${auction.id}/payment`);
      return;
    } catch (err) {
      // 서버 관문 거부 — 화면 상태가 낡았다. #453 문법: 시트를 닫아야 모달(z-400)이 보인다.
      if (isGateRejection(err)) {
        setSheetOpen(false);
        setAddressModalOpen(true);
      } else {
        setSheetOpen(false);
        toast.show({
          variant: "danger",
          text: err instanceof ApiError ? err.message : "즉시구매에 실패했습니다. 잠시 후 다시 시도해주세요.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const specRows: { label: string; value: string }[] = [
    { label: "그룹", value: auction.artistName ?? "-" },
    ...(auction.idolName ? [{ label: "멤버", value: auction.idolName }] : []),
    ...(auction.albumName ? [{ label: "앨범", value: auction.albumName }] : []),
    { label: "출처", value: SOURCE_LABEL[auction.source] ?? auction.source },
    { label: "상태 등급", value: GRADE_LABEL[auction.grade] ?? auction.grade },
    { label: "미개봉", value: auction.unopened ? "예" : "아니오" },
  ];

  const showBar = isLive || isMatched;

  return (
    /*
      하단 여백 규칙(#457) — 마감 32px 상시. **바가 있어도 그 높이를 더하지 않는다**(#519):
      바가 덮는 것은 페이지 맨 끝의 푸터고, 푸터가 자기 몫을 이미 비운다(제안판매 상세와 같은 판단).
      그래서 `showBar` 분기가 사라졌다 — 두 경우가 같은 값을 쓴다.
    */
    <div className="pb-8">
      <MobileDetailGallery images={auction.images} video={auction.video} title={auction.title} actions={actions} />

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className={`text-[11.5px] font-bold ${isLive || isMatched ? "text-ok" : "text-text-3"}`}>
            {isLive ? "판매 중" : isMatched ? "거래 진행 중" : status === "ENDED_SOLD" ? "거래 완료" : "판매 종료"}
          </span>
          {auction.artistName && (
            <Link
              href={`/artists/${auction.artistId}`}
              className={`min-w-0 truncate text-[11.5px] font-extrabold text-text-2 ${FOCUS_RING}`}
            >
              {auction.artistName}
            </Link>
          )}
        </div>

        <h1 className="mt-2 text-[19px] font-extrabold leading-[1.4] tracking-[-0.01em] text-text-1">
          {auction.title}
        </h1>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-chip border border-border-2 px-2 py-[3px] text-[11px] font-extrabold text-text-2">
            {GRADE_LABEL[auction.grade] ?? auction.grade}
          </span>
          <span className="rounded-chip border border-border-2 px-2 py-[3px] text-[11px] font-extrabold text-text-2">
            {SOURCE_LABEL[auction.source] ?? auction.source}
          </span>
          {auction.unopened && (
            <span className="rounded-chip border border-border-2 px-2 py-[3px] text-[11px] font-extrabold text-text-2">
              미개봉
            </span>
          )}
        </div>

        {/* 가격 카드 — 제안 패널과 같은 골격, 라벨과 안내만 다르다. */}
        <div className="mt-4 rounded-r3 border border-border p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-text-3">즉시판매가</p>
            <p className="text-[11px] text-text-3">
              조회 <b className="font-semibold text-text-2 tabular-nums">{auction.viewCount.toLocaleString("ko-KR")}</b>
              {" · ♡ "}
              <b className="font-semibold text-text-2 tabular-nums">{wishlistCount.toLocaleString("ko-KR")}</b>
            </p>
          </div>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-text-1">{formatKRW(price)}</p>
          <p className="mt-3 border-t border-border pt-2.5 text-[10.5px] leading-relaxed text-text-3">
            구매를 확정하면 그 순간 거래가 성사돼요. 예상 결제 총액{" "}
            <b className="font-bold text-text-2 tabular-nums">{formatKRW(estimatedTotal(price))}</b>
            (수수료 포함).
          </p>
        </div>

        <SellerRow sellerId={auction.sellerId} nickname={auction.sellerNickname} />

        <MobileDetailTabs description={auction.description} specRows={specRows} />
      </div>

      {/* 하단 고정 바 — 제안판매와 같은 구성. MATCHED에도 남겨 「왜 못 사는지」를 바가 말한다
          (정책 제13조 ① — 다른 회원에게 「다른 구매자가 거래를 진행 중」 안내). */}
      {showBar && (
        <div
          className="fixed inset-x-0 bottom-0 z-[400] flex items-center gap-2.5 border-t border-border bg-white px-4 pt-2.5 sm:hidden"
          style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
        >
          <AuctionWishlistButton
            auctionId={auction.id}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[7px] border border-border-2 bg-white text-text-2 ${FOCUS_RING}`}
          />
          {isMatched && isMyOrder ? (
            <Link
              href={`/orders/${auction.id}/payment`}
              className={`flex h-11 flex-1 items-center justify-center rounded-[7px] bg-primary text-[13.5px] font-extrabold text-white ${FOCUS_RING}`}
            >
              결제하러 가기
            </Link>
          ) : isMatched ? (
            <span className="flex h-11 flex-1 items-center justify-center rounded-[7px] bg-surface-3 text-[13.5px] font-extrabold text-text-3">
              다른 구매자가 거래 진행 중
            </span>
          ) : isOwnSale ? (
            <span className="flex h-11 flex-1 items-center justify-center rounded-[7px] bg-surface-3 text-[13.5px] font-extrabold text-text-3">
              내 상품은 구매할 수 없어요
            </span>
          ) : !accessToken ? (
            <Link
              href={`/login?redirect=/auctions/${auction.id}`}
              className={`flex h-11 flex-1 items-center justify-center rounded-[7px] bg-primary text-[13.5px] font-extrabold text-white ${FOCUS_RING}`}
            >
              로그인하고 즉시구매
            </Link>
          ) : (
            <button
              type="button"
              onClick={openSheet}
              className={`flex h-11 flex-1 items-center justify-center rounded-[7px] bg-primary text-[13.5px] font-extrabold text-white ${FOCUS_RING}`}
            >
              즉시구매
            </button>
          )}
        </div>
      )}

      {sheetOpen && (
        <ConfirmSheet price={price} submitting={submitting} onConfirm={() => void purchase()} onClose={() => setSheetOpen(false)} />
      )}

      {addressModalOpen && (
        <DeliveryAddressGateModal
          action="즉시구매"
          onClose={() => setAddressModalOpen(false)}
          onSaved={() => {
            setAddressModalOpen(false);
            markRegistered();
            toast.show({ variant: "success", text: "배송지를 등록했어요.", sub: "이제 구매할 수 있어요." });
            // 저장이 구매를 대신 누르지 않는다(#283) — 확인 시트를 열어 흐름만 잇는다.
            setSheetOpen(true);
          }}
        />
      )}
    </div>
  );
}
