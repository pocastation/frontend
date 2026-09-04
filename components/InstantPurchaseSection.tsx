"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DeliveryAddressGateModal from "@/components/DeliveryAddressGateModal";
import { ApiError } from "@/lib/api";
import SellerListingActions from "@/components/SellerListingActions";
import { useAuth } from "@/lib/auth-context";
import { useDeliveryAddressGate } from "@/lib/use-delivery-address-gate";
import { buyerFee, estimatedTotal } from "@/lib/fees";
import { formatKRW } from "@/lib/format";
import { PRIMARY_BUTTON_CLASS } from "@/lib/ui";
import type { AuctionPurchaseResponse, AuctionStatus } from "@/lib/types";

type Props = {
  saleId: number;
  price: number;
  status: AuctionStatus;
  /** 판매자 회원 id — 본인 판정용(#536). */
  sellerId: string;
  viewCount: number;
};

const STATUS_LABEL: Partial<Record<AuctionStatus, string>> = {
  MATCHED: "결제 대기",
  ENDED_SOLD: "판매완료",
  CANCELLED: "취소됨",
};

export default function InstantPurchaseSection({
  saleId,
  price,
  status,
  sellerId,
  viewCount,
}: Props) {
  const router = useRouter();
  const { member, accessToken, fetchWithAuth } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  // 배송지 관문(#283) — 즉시구매는 누르는 즉시 거래가 성사돼 가격 제안보다 더 앞에서 잡아야 한다.
  const { needsAddress, markRegistered, isGateRejection } = useDeliveryAddressGate();
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const isLive = currentStatus === "LIVE";
  const isOwnSale = member?.id != null && member.id === sellerId;
  const total = estimatedTotal(price);

  async function handlePurchase() {
    // 배송지가 없으면 구매를 보내지 않는다(#283). 즉시구매는 되돌릴 여지가 없어 더 엄격하다.
    if (needsAddress) {
      setAddressModalOpen(true);
      return;
    }
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetchWithAuth<AuctionPurchaseResponse>(`/api/auctions/${saleId}/purchase`, {
        method: "POST",
      });
      setCurrentStatus(res.status);
      // 구매 성공 = 주문 생성이지 결제 완료가 아니다(A안). 결제 페이지로 곧바로 넘긴다 —
      // 여기서 멈추면 "구매했는데 돈 낼 곳이 없는" 상태로 보인다(FE #333).
      router.push(`/orders/${saleId}/payment`);
      return;
    } catch (err) {
      // 서버 관문 거부 — 화면 상태가 낡았다(다른 탭에서 지웠거나 조회가 실패했다). 모달로 이어 붙인다.
      if (isGateRejection(err)) {
        setAddressModalOpen(true);
      } else {
        setMessage({
          type: "err",
          text: err instanceof ApiError ? err.message : "즉시구매에 실패했습니다. 잠시 후 다시 시도해주세요.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6">
      <div className={`rounded-r3 border border-border p-4 shadow-card ${isLive ? "bg-primary-soft" : "bg-surface"}`}>
        <div className="flex items-center justify-between text-xs font-semibold text-text-3">
          <span>판매가</span>
          <span>즉시판매</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="font-display text-3xl font-extrabold text-text-1 tabular-nums">
            {formatKRW(price)}
          </span>
          <span className={`shrink-0 text-right text-sm font-bold ${isLive ? "text-primary" : "text-text-3"}`}>
            {isLive ? "구매 가능" : (STATUS_LABEL[currentStatus] ?? "종료")}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-text-3">
          <span>
            구매자 수수료 <span className="font-semibold text-text-2 tabular-nums">{formatKRW(buyerFee(price))}</span>
          </span>
          <span>
            조회 <span className="font-semibold text-text-2 tabular-nums">{viewCount.toLocaleString("ko-KR")}</span>
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-text-3">
          <span className="font-semibold text-text-2">예상 결제 총액</span>
          <span className="font-display text-sm font-extrabold text-primary tabular-nums">{formatKRW(total)}</span>
        </div>
      </div>

      {isLive &&
        (isOwnSale ? (
          /*
            🔴 예전에는 「내 상품입니다. 직접 구매할 수 없어요.」 한 줄로 끝나 판매자가 자기 매물에서
            **할 수 있는 게 아무것도 없었다**(#533). 못 하는 일을 알리는 자리를 할 수 있는 일로 바꾼다.
            즉시판매엔 제안이 없으므로 잠금도 없다 — 판매 중이면 언제든 가격을 바꿀 수 있다.
          */
          <SellerListingActions
            auctionId={saleId}
            saleType="INSTANT"
            price={price}
            offerCount={0}
            viewport="desktop"
            onChanged={() => router.refresh()}
          />
        ) : !accessToken ? (
          <Link
            href={`/login?redirect=/auctions/${saleId}`}
            className={`mt-4 flex h-11 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
          >
            로그인하고 즉시구매
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePurchase}
              disabled={submitting}
              className={`mt-4 flex h-11 w-full items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
            >
              {submitting
                ? "처리 중..."
                : needsAddress
                  ? "배송지 등록하고 구매하기"
                  : `${formatKRW(price)} 즉시구매`}
            </button>
            {/* 누르기 전에 알려준다(#283). 즉시구매는 누르는 즉시 계약이라 더 앞에서 말해야 한다. */}
            {needsAddress && (
              <p className="mt-2 text-[11.5px] leading-[1.6] text-text-3">
                구매하면 바로 보내드릴 수 있게 받을 주소를 먼저 등록해요.{" "}
                <b className="font-bold text-text-2">한 번만 하면 다음부터는 물어보지 않아요.</b>
              </p>
            )}
          </>
        ))}

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

      {/* 저장해도 구매를 대신 눌러주지 않는다 — 즉시구매는 누르는 즉시 계약이라 더더욱 안 된다. */}
      {addressModalOpen && (
        <DeliveryAddressGateModal
          action="구매"
          onClose={() => setAddressModalOpen(false)}
          onSaved={() => {
            setAddressModalOpen(false);
            markRegistered();
            setMessage({ type: "ok", text: "배송지를 등록했어요. 이제 구매할 수 있어요." });
          }}
        />
      )}
    </div>
  );
}
