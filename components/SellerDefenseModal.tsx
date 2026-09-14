"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { RETURN_REASON_LABEL } from "@/lib/labels";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type { ReturnReason } from "@/lib/types";

/**
 * 판매자 의견 제출(#637, BE #494).
 *
 * <p>예전에는 「거절」이었고 사유를 {@code window.prompt}로 받았다. 두 가지가 바뀌었다 —
 * 판매자가 거절로 절차를 끝낼 수 없게 됐고(의견을 내면 운영팀이 판단한다), 그래서 이 글이
 * <b>판단의 근거</b>가 된다. 한 줄 입력창으로 받을 글이 아니다.
 *
 * <p>구매자 주장을 함께 보여준다. 무엇에 답하는지 모르고 쓰면 반박이 어긋난다.
 */
export default function SellerDefenseModal({
  auctionId,
  title,
  returnReason,
  returnDetail,
  onClose,
  onDone,
}: {
  auctionId: number;
  title: string;
  returnReason: ReturnReason | null;
  returnDetail: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (saving) return;
    if (!note.trim()) {
      setError("의견을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/order/return/defense`, {
        method: "POST",
        body: { note: note.trim() },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "의견을 제출하지 못했어요. 잠시 후 다시 시도해 주세요.");
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
        aria-label="반품 의견 제출"
      >
        <p className="text-sm font-bold text-text-1">반품 요청에 의견을 낼게요</p>
        <p className="mt-1 text-xs text-text-3">
          <b className="font-bold text-text-2">{title}</b> 거래예요.
        </p>

        {/* 구매자 주장을 먼저 보여준다 — 무엇에 답하는지 모르고 쓰면 반박이 어긋난다. */}
        {returnReason && (
          <div className="mt-4 rounded-r3 border border-border bg-surface-2 px-3.5 py-2.5">
            <span className="block text-[10.5px] font-bold uppercase tracking-wide text-text-3">
              구매자 주장
            </span>
            <p className="mt-1 text-xs leading-relaxed text-text-2">
              {RETURN_REASON_LABEL[returnReason]}
              {returnDetail ? ` · ${returnDetail}` : ""}
            </p>
          </div>
        )}

        <label className="mt-4 block">
          <span className="text-xs font-bold text-text-2">의견</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={5}
            placeholder="어떤 점이 사실과 다른지, 발송 당시 상태가 어땠는지 구체적으로 적어주세요."
            className={`mt-1.5 w-full resize-none rounded-r3 border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 ${FOCUS_RING}`}
          />
          <span className="mt-1 block text-right text-[11px] text-text-3">{note.length}/500</span>
        </label>

        <div className="mt-3 rounded-r3 border border-border bg-surface-2 px-3.5 py-2.5 text-[11px] leading-relaxed text-text-2">
          제출하면 <b className="font-bold text-text-1">운영팀이 양쪽 자료를 보고 대금 처리를 결정</b>해요.
          반품을 받아들일 생각이면 의견 대신 <b className="font-bold text-text-1">수락</b>을 눌러 주세요 —
          바로 반품이 확정돼 더 빨리 끝나요.
        </div>

        {error && <p className="mt-3 text-xs font-semibold text-accent">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className={`h-10 flex-1 ${SECONDARY_BUTTON_CLASS}`}>
            닫기
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={`h-10 flex-1 disabled:opacity-60 ${PRIMARY_BUTTON_CLASS}`}
          >
            {saving ? "제출 중…" : "의견 제출"}
          </button>
        </div>
      </div>
    </div>
  );
}
