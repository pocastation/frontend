"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  RETURN_REASON_LABEL,
  RETURN_REASON_NEEDS_PHOTO,
  RETURN_REASON_OPTIONS,
  RETURN_SHIPPING_FEE_NOTE,
} from "@/lib/labels";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type { ReturnReason } from "@/lib/types";

// 구매자 반품 요청 모달(#213, #637 개편 · 약관 제15조). 물건을 받은 뒤 구매확정 전에만 열린다.
//
// 요청은 판매자가 아니라 **회사에 접수**된다(BE #494). 그 점을 미리 알려야 「판매자가 응답을
// 안 한다」는 오해가 생기지 않는다.
//
// 사진 첨부는 아직 없다 — MediaImageOwnershipGate가 경매 전용 시그니처라 media 모듈 일반화가
// 선행돼야 한다(별도 이슈). 필수 사유에는 안내 문구만 띄운다.
export default function ReturnRequestModal({
  auctionId,
  title,
  onClose,
  onDone,
}: {
  auctionId: number;
  title: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [reason, setReason] = useState<ReturnReason | null>(null);
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (saving) return;
    if (!reason) {
      setError("반품 사유를 선택해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/order/return`, {
        method: "POST",
        body: { reason, detail: detail.trim() || null },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "반품을 요청하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-r3 border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="반품 요청"
      >
        <p className="text-sm font-bold text-text-1">반품을 요청할게요</p>
        <p className="mt-1 text-xs text-text-3">
          <b className="font-bold text-text-2">{title}</b> 거래예요.
        </p>

        <fieldset className="mt-4">
          <legend className="text-xs font-bold text-text-2">반품 사유</legend>
          <div className="mt-2 divide-y divide-border rounded-r3 border border-border">
            {RETURN_REASON_OPTIONS.map((code) => (
              <label
                key={code}
                className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-sm ${
                  reason === code ? "text-text-1" : "text-text-2"
                }`}
              >
                <input
                  type="radio"
                  name="return-reason"
                  value={code}
                  checked={reason === code}
                  onChange={() => setReason(code)}
                  className={`h-3.5 w-3.5 accent-primary ${FOCUS_RING}`}
                />
                <span className="font-semibold">{RETURN_REASON_LABEL[code]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* 반송비는 정산에 반영하지 않고 안내만 한다(2026-07-23 결정) — 사유에 따라 문구가 달라진다.
            단순 변심은 수수료 공제·반송비 자기 부담이라 고른 즉시 알려야 한다(§7.1-A S1·S3). */}
        {reason && (
          <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-text-3">
            <p>{RETURN_SHIPPING_FEE_NOTE[reason]}</p>
            {RETURN_REASON_NEEDS_PHOTO[reason] && (
              <p>
                이 사유는 <b className="font-bold text-text-2">사진이 있어야 판단할 수 있어요</b> —
                아래에 어떤 상태인지 적어주시면 운영팀이 검토하면서 사진을 요청해요.
              </p>
            )}
          </div>
        )}

        <label className="mt-4 block">
          <span className="text-xs font-bold text-text-2">자세한 설명 (선택)</span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="어떤 점이 달랐는지 구체적으로 적어주시면 운영팀이 빠르게 검토할 수 있어요."
            className={`mt-1.5 w-full resize-none rounded-r3 border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 ${FOCUS_RING}`}
          />
          <span className="mt-1 block text-right text-[11px] text-text-3">{detail.length}/500</span>
        </label>

        <div className="mt-3 rounded-r3 border border-border bg-surface-2 px-3.5 py-2.5 text-[11px] leading-relaxed text-text-2">
          요청은 <b className="font-bold text-text-1">운영팀에 접수</b>돼요. 3영업일 안에 검토해
          판매자에게 전달하고, 판매자 의견을 받아 대금 처리를 결정해요. 반품이 확정되면 물품을
          반송한 뒤 환불돼요.
        </div>

        {error && <p className="mt-3 text-xs font-semibold text-accent">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`h-10 flex-1 ${SECONDARY_BUTTON_CLASS}`}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={`h-10 flex-1 disabled:opacity-60 ${PRIMARY_BUTTON_CLASS}`}
          >
            {saving ? "요청 중…" : "반품 요청"}
          </button>
        </div>
      </div>
    </div>
  );
}
