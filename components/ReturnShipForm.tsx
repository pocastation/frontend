"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING, INPUT_CLASS } from "@/lib/ui";

type Carrier = { code: string; name: string };

// 구매자 반송 운송장 등록(#213, 약관 제15조 제2항 b). 판매자 발송(OrderShipForm)과 같은 모양이지만
// 반송은 배송추적 폴링 대상이 아니라 코드를 서버에 보내지 않는다 — 수령 확인은 판매자가 직접 하고,
// 안 하면 기한(5일) 초과로 자동 환불된다.
export default function ReturnShipForm({
  auctionId,
  onShipped,
}: {
  auctionId: number;
  onShipped: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierCode, setCarrierCode] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchWithAuth<Carrier[]>("/api/delivery/carriers")
      .then((list) => {
        if (alive) setCarriers(list ?? []);
      })
      .catch(() => {
        /* 목록을 못 불러도 등록 자체는 막지 않는다 */
      });
    return () => {
      alive = false;
    };
  }, [fetchWithAuth]);

  async function submit() {
    if (saving) return;
    const carrier = carriers.find((c) => c.code === carrierCode);
    if (!carrier || !trackingNumber.trim()) {
      setError("택배사와 운송장 번호를 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/order/return/ship`, {
        method: "POST",
        body: { carrier: carrier.name, trackingNumber: trackingNumber.trim() },
      });
      onShipped();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "반송 등록을 하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2.5 flex w-full flex-col gap-2 rounded-r2 border border-border bg-surface p-3">
      <div className="flex gap-2">
        <select
          className={`${INPUT_CLASS} w-32`}
          value={carrierCode}
          onChange={(e) => setCarrierCode(e.target.value)}
          aria-label="반송 택배사"
        >
          <option value="">택배사 선택</option>
          {carriers.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className={`${INPUT_CLASS} flex-1`}
          placeholder="반송 운송장 번호"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
        />
      </div>
      {error && <p role="alert" className="text-[12px] font-semibold text-accent">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className={`self-end rounded-r2 bg-text-1 px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-text-2 disabled:opacity-60 ${FOCUS_RING}`}
      >
        반송 등록
      </button>
    </div>
  );
}
