"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { formatKRW } from "@/lib/format";
import OrderShipForm from "@/components/OrderShipForm";
import type { SoldOrderResponse } from "@/lib/types";

// 매물 상세의 판매자 발송 패널(#119) — 거래 성사(ENDED_SOLD) 상세에서 판매자 본인에게만 노출된다.
// sold-orders 조회가 대상자(판매자)에게만 이 매물 주문을 주므로, 조회 성공 자체가 노출 게이트.
export default function SellerShipPanel({ auctionId }: { auctionId: number }) {
  const { accessToken, isLoading, fetchWithAuth } = useAuth();
  const [order, setOrder] = useState<SoldOrderResponse | null>(null);
  const [shipOpen, setShipOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth<SoldOrderResponse[]>(
        `/api/members/me/sold-orders/status?auctionIds=${auctionId}`,
      );
      // 결제 완료된 주문(fulfillmentStatus 있음)만 발송 대상 — 내 판매 건이 아니면 빈 배열.
      setOrder(res.find((o) => o.auctionId === auctionId && o.fulfillmentStatus != null) ?? null);
    } catch {
      // 실패·비대상은 조용히 패널을 감춘다.
    }
  }, [fetchWithAuth, auctionId]);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 인증 확정 후 내 판매 주문 1회 조회.
    void load();
  }, [accessToken, isLoading, load]);

  if (!accessToken || !order) return null;

  const fs = order.fulfillmentStatus;
  const addr = order.deliveryAddress;

  return (
    <div className="mt-4 rounded-r3 border border-border bg-surface-2/40 p-4">
      <p className="text-sm font-bold text-text-1">판매자 · 배송 관리</p>
      {fs === "CONFIRMED" ? (
        <p className="mt-1.5 flex items-center gap-2 text-[13px] text-text-2">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
          구매가 확정됐어요. 정산 예정 {formatKRW(order.payoutAmount)} · 정산 준비 중
        </p>
      ) : fs === "SHIPPED" ? (
        <p className="mt-1.5 flex items-center gap-2 text-[13px] text-text-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          발송 완료 · {order.carrier} {order.trackingNumber}
        </p>
      ) : addr ? (
        <>
          <p className="mt-1.5 text-[13px] text-text-2">
            받는 분 <b className="font-bold text-text-1">{addr.recipientName}</b> · {addr.phone}
          </p>
          <p className="text-[13px] text-text-2">
            ({addr.postalCode}) {addr.address1} {addr.address2 ?? ""}
          </p>
          <button
            type="button"
            onClick={() => setShipOpen((v) => !v)}
            className="mt-2 rounded-r2 bg-text-1 px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-text-2"
          >
            발송 처리
          </button>
          {shipOpen && (
            <OrderShipForm
              auctionId={auctionId}
              onShipped={() => {
                setShipOpen(false);
                void load();
              }}
            />
          )}
        </>
      ) : (
        <p className="mt-1.5 flex items-center gap-2 text-[13px] text-text-2">
          <span className="h-1.5 w-1.5 rounded-full bg-text-3" aria-hidden="true" />
          구매자가 배송지를 입력하면 발송할 수 있어요.
        </p>
      )}
    </div>
  );
}
