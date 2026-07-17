"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING, INPUT_CLASS } from "@/lib/ui";

type Carrier = { code: string; name: string };

// 판매자 발송 처리(운송장 입력, #119). 택배사는 드롭다운(#134) — 선택 시 표시명(carrier)과
// 배송추적용 코드(carrierCode)를 함께 보낸다. 경매 상세·마이페이지 판매 내역 두 곳에서 재사용한다.
export default function OrderShipForm({
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
        /* 목록을 못 불러도 발송 자체는 막지 않는다 — 아래에서 안내 */
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
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/order/ship`, {
        method: "POST",
        body: { carrier: carrier.name, carrierCode: carrier.code, trackingNumber: trackingNumber.trim() },
      });
      onShipped();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "발송 처리를 하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2 rounded-r2 border border-border bg-surface p-3">
      <div className="flex gap-2">
        <select
          className={`${INPUT_CLASS} w-32`}
          value={carrierCode}
          onChange={(e) => setCarrierCode(e.target.value)}
          aria-label="택배사"
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
          placeholder="운송장 번호"
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
        발송 처리
      </button>
    </div>
  );
}
