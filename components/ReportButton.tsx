"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { REPORT_REASON_LABEL, REPORT_REASON_OPTIONS } from "@/lib/labels";
import { ACTION_ICON_BUTTON, FOCUS_RING } from "@/lib/ui";
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
        aria-label={justSubmitted ? "신고 접수됨" : "신고하기"}
        title={justSubmitted ? "접수됨" : "신고"}
        className={ACTION_ICON_BUTTON}
      >
        {justSubmitted ? (
          // 접수 완료 체크
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          // 신고(siren) — Lucide
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {/*
              광학 정렬(#519) — 도형 범위(y 2~22)는 대칭이지만 **보이는 무게는 아래에 몰려 있다**:
              덮개(획 27.7)와 받침(33.4)이 아래쪽이고 위쪽은 가느다란 불빛 선 다섯 개(합 4.7)뿐이라
              획 가중 중심이 y 15.87 — viewBox 중심(12)보다 3.87 아래다. 원 안에서 사이렌만
              가라앉아 보이던 이유다. 2만큼 올려 눈에 맞춘다(최상단 2→0, 받침 22→20으로 안 잘린다).
            */}
            <g transform="translate(0,-2)">
              <path d="M7 18v-6a5 5 0 1 1 10 0v6" />
              <path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" />
              <path d="M21 12h1" />
              <path d="M18.5 4.5 18 5" />
              <path d="M2 12h1" />
              <path d="M12 2v1" />
              <path d="m4.929 4.929.707.707" />
              <path d="M12 12v6" />
            </g>
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-r3 bg-surface p-5 shadow-modal">
            <h2 className="font-display text-base font-extrabold text-text-1">신고하기</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-3">
              이 매물의 어떤 점이 문제인지 알려주세요. 접수된 신고는 운영팀이 검토 후 필요한 조치를 취합니다.
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
