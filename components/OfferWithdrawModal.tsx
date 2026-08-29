"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 제안 철회 확인 모달(거래 개편 §1.2, #428).
 *
 * <p><b>왜 확인을 받나.</b> 취소는 되돌릴 수 없다 — 원장에는 남지만(§2.1) 그 제안이 되살아나지는
 * 않고, 판매자 목록과 제안 인원수에서 즉시 빠진다.
 *
 * <p>🔴 <b>「다시 제안할 수 있다」를 함께 말한다.</b> 이 문장이 없으면 「취소하면 이 매물에서
 * 끝인가」라는 오해가 생긴다. 실제로 §9.2의 재제안 금지는 <b>거래를 이탈한 사람</b>
 * (미결제 확정·입금 후 취소)에게만 걸리고, 제안을 거둬들이기만 한 사람은 자유다 —
 * §2.9가 청약 철회의 자유를 「뺏으면 법적으로 위험하다」고 보호한 그 자유다.
 *
 * <p>확인 버튼을 <b>붉게 두지 않는다.</b> 겁줄 이유가 없다 — 정당한 권리 행사다.
 */
export default function OfferWithdrawModal({
  auctionId,
  bidId,
  title,
  onClose,
  onWithdrawn,
}: {
  auctionId: number;
  bidId: number;
  title: string;
  onClose: () => void;
  onWithdrawn: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/bids/${bidId}/cancel`, { method: "POST" });
      onWithdrawn();
    } catch (err) {
      // 판매자가 방금 이 제안을 골랐을 수 있다(§9.1의 경합). 그때 서버는 전용 코드로 거절하고,
      // 그 메시지가 「주문 취소를 이용해주세요」까지 안내한다 — 그대로 보여준다.
      setError(err instanceof ApiError ? err.message : "제안을 취소하지 못했어요. 잠시 후 다시 시도해주세요.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 px-4"
      onClick={busy ? undefined : onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[360px] rounded-r3 border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="제안 취소 확인"
      >
        <h3 className="text-[15px] font-bold tracking-[-0.01em] text-text-1">이 제안을 거둬들일까요?</h3>
        <p className="mt-1.5 truncate text-[11.5px] text-text-3">{title}</p>

        <p className="mt-3 text-[12.5px] leading-relaxed text-text-2">
          제안이 판매자의 목록에서 사라지고, <b className="font-bold text-text-1">다시 되돌릴 수 없어요.</b>
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-3">
          같은 매물에 새로 제안하는 건 언제든 가능해요.
        </p>

        {error && <p className="mt-3 text-[11.5px] leading-relaxed text-accent">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`h-[42px] flex-1 rounded-r2 border border-border-2 bg-surface text-[13px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-60 ${FOCUS_RING}`}
          >
            그대로 두기
          </button>
          <button
            type="button"
            onClick={() => void withdraw()}
            disabled={busy}
            className={`h-[42px] flex-1 rounded-r2 bg-text-1 text-[13px] font-bold text-white transition-colors hover:bg-text-2 disabled:opacity-60 ${FOCUS_RING}`}
          >
            {busy ? "취소 중..." : "제안 취소"}
          </button>
        </div>
      </div>
    </div>
  );
}
