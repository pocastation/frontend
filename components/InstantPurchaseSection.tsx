"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { buyerFee, estimatedTotal } from "@/lib/fees";
import { formatKRW } from "@/lib/format";
import { PRIMARY_BUTTON_CLASS } from "@/lib/ui";
import type { AuctionPurchaseResponse, AuctionStatus } from "@/lib/types";

type Props = {
  saleId: number;
  price: number;
  status: AuctionStatus;
  sellerNickname: string;
  viewCount: number;
};

const STATUS_LABEL: Partial<Record<AuctionStatus, string>> = {
  ENDED_SOLD: "판매완료",
  CANCELLED: "취소됨",
};

export default function InstantPurchaseSection({
  saleId,
  price,
  status,
  sellerNickname,
  viewCount,
}: Props) {
  const { member, accessToken, fetchWithAuth } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isLive = currentStatus === "LIVE";
  const isOwnSale = member?.nickname != null && member.nickname === sellerNickname;
  const total = estimatedTotal(price);

  async function handlePurchase() {
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetchWithAuth<AuctionPurchaseResponse>(`/api/auctions/${saleId}/purchase`, {
        method: "POST",
      });
      setCurrentStatus(res.status);
      setMessage({ type: "ok", text: "즉시구매 요청이 완료됐어요." });
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof ApiError ? err.message : "즉시구매에 실패했습니다. 잠시 후 다시 시도해주세요.",
      });
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
          <div className="mt-4 rounded-r2 border border-border bg-surface-2 p-4 text-center text-sm font-semibold text-text-2">
            내 상품입니다. 직접 구매할 수 없어요.
          </div>
        ) : !accessToken ? (
          <Link
            href={`/login?redirect=/auctions/${saleId}`}
            className={`mt-4 flex h-11 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
          >
            로그인하고 즉시구매
          </Link>
        ) : (
          <button
            type="button"
            onClick={handlePurchase}
            disabled={submitting}
            className={`mt-4 flex h-11 w-full items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
          >
            {submitting ? "처리 중..." : `${formatKRW(price)} 즉시구매`}
          </button>
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
    </div>
  );
}
