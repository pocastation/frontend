"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { REPORT_REASON_LABEL, REPORT_REASON_OPTIONS } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ReportReason } from "@/lib/types";

// 경매 상세 페이지 상단 액션 줄(공유/찜하기)에 나란히 붙는 신고 진입점 + 모달.
export default function ReportButton({ auctionId }: { auctionId: number }) {
  const { accessToken, fetchWithAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  function openModal() {
    if (!accessToken) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setReason(null);
    setDetail("");
    setError(null);
    setOpen(true);
  }

  async function submit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/reports`, {
        method: "POST",
        body: { reasonCode: reason, detail: detail.trim() || undefined },
      });
      setOpen(false);
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "신고 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`flex items-center gap-1 rounded-r2 px-2 py-1 text-xs font-semibold transition-colors ${
          justSubmitted ? "text-ok" : "text-text-3 hover:text-accent"
        } ${FOCUS_RING}`}
      >
        <span aria-hidden="true">{justSubmitted ? "✓" : "🚩"}</span>
        {justSubmitted ? "접수됨" : "신고"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-r3 bg-surface p-5 shadow-modal">
            <h2 className="font-display text-base font-extrabold text-text-1">신고하기</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-3">
              이 경매의 어떤 점이 문제인지 알려주세요. 접수된 신고는 운영팀이 검토 후 필요한 조치를 취합니다.
            </p>

            <fieldset className="mt-3.5">
              <legend className="mb-2 text-xs font-bold text-text-2">신고 사유 선택 (필수)</legend>
              <div className="flex flex-col gap-1.5">
                {REPORT_REASON_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-2 rounded-r2 border px-3 py-2 text-[13px] font-semibold transition-colors ${
                      reason === option ? "border-primary bg-primary-soft text-primary" : "border-border text-text-2"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={option}
                      checked={reason === option}
                      onChange={() => setReason(option)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {REPORT_REASON_LABEL[option]}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-3.5 mb-1.5 block text-xs font-bold text-text-2" htmlFor="report-detail">
              상세 내용 (선택)
            </label>
            <textarea
              id="report-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="구체적인 내용을 입력해주세요. (선택)"
              rows={3}
              className={`w-full resize-none rounded-r2 border border-border px-3 py-2 text-[13px] outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
            />

            <p className="mt-2 text-[11px] leading-relaxed text-text-3">
              ⓘ 이미 접수한 신고가 있는 경우 새 신고 대신 기존 신고에 신고자로 추가됩니다.
            </p>

            {error && (
              <p role="alert" className="mt-2 rounded-r2 bg-accent-soft px-3 py-2 text-[12px] font-semibold text-accent">
                {error}
              </p>
            )}

            <div className="mt-3.5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className={`h-10 flex-1 rounded-r2 border border-border-2 bg-white text-sm font-bold text-text-2 transition-colors hover:border-primary disabled:opacity-60 ${FOCUS_RING}`}
              >
                닫기
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!reason || submitting}
                className={`h-10 flex-1 rounded-r2 bg-accent text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS_RING}`}
              >
                {submitting ? "처리 중..." : "신고 접수"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
