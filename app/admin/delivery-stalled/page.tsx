"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTimeKST } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminStalledOrderResponse } from "@/lib/types";
import AdminNotice from "@/components/AdminNotice";

/**
 * 배송 정체 주문 운영(#474, BE #408).
 *
 * <p>자동확정이 「배송완료+3일」 하나가 되면서(#404), 추적이 배송완료를 못 올린 주문은 영영
 * 자동확정되지 않고 판매자 대금이 묶인다. 관리자가 택배사 사이트에서 배송완료를 사람이 확인한 뒤
 * 여기서 수동 기록한다 — <b>즉시 확정이 아니라</b> 그 순간부터 기존 파이프라인(구매자에게
 * 배송완료+자동확정 3일 예고 알림 → 3일 뒤 자동확정)이 그대로 돈다.
 */
export default function AdminDeliveryStalledPage() {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<AdminStalledOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchWithAuth<AdminStalledOrderResponse[]>("/api/admin/orders/delivery-stalled"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "배송 정체 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 서버 목록을 1회 로드.
    void load();
  }, [load]);

  // 판매자 대금이 걸린 개입이라 confirm을 거치고, 서버에서 감사로그로 남는다.
  async function markDelivered(item: AdminStalledOrderResponse) {
    if (
      !window.confirm(
        `「${item.title}」을 배송완료로 기록할까요?\n\n택배사 사이트에서 배송완료를 직접 확인한 경우에만 진행하세요. 기록 시점부터 구매자에게 알림이 가고, 3일 뒤 자동으로 거래가 확정돼요.`,
      )
    )
      return;
    setBusyId(item.orderId);
    setNotice(null);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/admin/orders/${item.orderId}/mark-delivered`, { method: "POST" });
      setNotice(`「${item.title}」을 배송완료로 기록했어요. 3일 뒤 자동 확정돼요.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "배송완료 기록에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-xl font-extrabold text-text-1">배송 확인</h1>
        <p className="mt-1 text-sm text-text-3">
          발송 후 7일이 지나도 배송완료가 확인되지 않은 주문이에요. 택배사 사이트에서 운송장을 조회해
          배송이 끝났으면 수동으로 기록해 주세요.
        </p>
      </header>

      <div className="mb-4 flex items-center">
        <span className="ml-auto text-xs text-text-3">확인 필요 {items.length}건</span>
      </div>

      {notice && (
        <AdminNotice kind="info" className="mb-3">
          {notice}
        </AdminNotice>
      )}
      {error && (
        <AdminNotice kind="error" className="mb-3">
          {error}
        </AdminNotice>
      )}

      <div className="overflow-hidden rounded-r3 border border-border bg-surface">
        {loading ? (
          <p className="py-20 text-center text-sm text-text-3">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-sm text-text-3">배송 확인이 필요한 주문이 없어요.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.orderId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
                <div className="min-w-0 flex-1 basis-56">
                  <Link
                    href={`/auctions/${item.auctionId}`}
                    className={`block truncate text-sm font-bold text-text-1 hover:text-primary ${FOCUS_RING}`}
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-text-3">
                    주문 #{item.orderId} · 발송 {formatDateTimeKST(item.shippedAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className="font-bold text-text-2">{item.carrier ?? "택배사 미상"}</p>
                  <p className="mt-0.5 tabular-nums text-text-3">{item.trackingNumber ?? "운송장 없음"}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void markDelivered(item)}
                  className={`h-9 shrink-0 rounded-r2 bg-text-1 px-3.5 text-xs font-bold text-white transition-colors hover:bg-text-2 disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {busyId === item.orderId ? "기록 중..." : "배송완료 기록"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-text-3">
        기록하면 구매자에게 배송완료·자동확정 예고 알림이 발송되고, 3일 뒤 거래가 자동 확정돼요. 즉시
        확정되는 게 아니라 구매자의 검수 기간 3일은 그대로 보장돼요.
      </p>
    </div>
  );
}
