"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { REPORT_REASON_LABEL, REPORT_REASON_OPTIONS } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ReportReason, ReportTargetType } from "@/lib/types";

/**
 * 대상별 안내. 사유 목록 <b>위</b>에서 갈림길을 가른다 — 아래에 두면 사유를 고른 뒤에 읽게 되어
 * 이미 늦다. 두 대상의 「신고로 풀 수 없는 문제」가 서로 다르다.
 */
const TARGET_COPY: Record<ReportTargetType, { noun: string; path: string }> = {
  AUCTION: { noun: "판매글", path: `/api/auctions` },
  EXCHANGE_POST: { noun: "교환글", path: `/api/exchanges` },
};

/** 신고(siren) — Lucide. 판매글 아이콘 버튼과 교환글 더보기 시트가 함께 쓴다. */
export function ReportSirenIcon() {
  return (
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
  );
}

/**
 * 신고 사유 모달. 여는 쪽이 {@code open}을 쥔다(#787).
 *
 * <p><b>왜 버튼과 갈라 두나.</b> 버튼이 모달 상태를 쥐고 있으면 버튼이 사라질 때 모달도 함께
 * 사라진다. 교환글 더보기 시트 안에 버튼을 두었더니, 「신고하기」를 누르는 순간 시트가 닫히며
 * 방금 연 모달까지 언마운트됐다. 모달은 시트보다 오래 사는 부모가 띄운다.
 *
 * <p>열릴 때마다 입력이 비어 있어야 해서 본문은 열려 있는 동안에만 마운트한다 — 닫았다 다시
 * 열면 지난 사유가 남아 있지 않다.
 */
export default function ReportModal({
  targetType,
  targetId,
  open,
  onClose,
  onSubmitted,
}: {
  targetType: ReportTargetType;
  targetId: number;
  open: boolean;
  onClose: () => void;
  /** 접수가 끝나 모달이 닫힌 뒤. 접수 피드백은 여는 쪽이 정한다. */
  onSubmitted: () => void;
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <ReportDialog targetType={targetType} targetId={targetId} onClose={onClose} onSubmitted={onSubmitted} />,
    document.body,
  );
}

function ReportDialog({
  targetType,
  targetId,
  onClose,
  onSubmitted,
}: {
  targetType: ReportTargetType;
  targetId: number;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`${TARGET_COPY[targetType].path}/${targetId}/reports`, {
        method: "POST",
        body: { reasonCode: reason, detail: detail.trim() || undefined },
      });
      onClose();
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "신고 접수에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    /*
      🔴 body로 portal + z-[500](#635). 인라인으로 두면 판매글 갤러리 우상단 액션 줄
      (`absolute right-3 top-3 z-[3]`)이 만든 스택 컨텍스트에 오버레이가 갇혀, 그 안에서 z를
      아무리 올려도 **밖으로 못 나간다**. 실제로 헤더(.hdr z-index 300)와 갤러리 화살표·
      「1/3」 카운터(z-10)가 모달 위로 뚫고 올라왔고, 모바일에서는 하단 액션바(z-400)·
      탭바(z-300)·뒤로 버튼·도트 인디케이터까지 올라왔다.

      같은 함정을 #454에서 SellerOfferPanel에 대해 같은 방법으로 풀었다. z 사다리는
      lib/ui.ts 주석에 정리해 뒀다.

      z는 모달 기본값 400이 아니라 500이다. 이 화면(모바일)에는 하단 고정 액션바가 z-400으로
      같이 떠 있어서, 400끼리 붙으면 승부가 DOM 순서로 갈린다 — portal이 body 끝에 붙어
      지금은 이기지만, 그건 우연에 기대는 것이다. 한 층 올려 못 박는다.
    */
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-card bg-surface p-5 shadow-modal">
        <h2 className="font-display text-body-l font-extrabold text-text-1">신고하기</h2>
        <p className="mt-2 text-body-s leading-relaxed text-text-3">
          이 {TARGET_COPY[targetType].noun}의 어떤 점이 문제인지 알려주세요. 접수된 신고는 운영팀이 검토 후 필요한 조치를 취합니다.
        </p>

        {/*
          🔴 신고는 **글**을 제재하는 도구다(#633). 신고로 풀 수 없는 문제가 신고로 들어오면
          운영팀이 그 신고로 할 수 있는 일이 없고, 신고자는 답을 받지 못한 채 기다린다 —
          신고는 답변을 돌려주는 창구가 아니다. 갈림길을 사유 목록 **위**에서 가른다.
          아래에 두면 사유를 고른 뒤에 읽게 되어 이미 늦다.

          대상마다 그 「풀 수 없는 문제」가 다르다. 판매글은 이미 결제한 거래이고, 교환글은
          현장에서 상대가 나오지 않은 경우다.
        */}
        {targetType === "AUCTION" ? (
          // 링크는 `/mypage`로 보낸다. 이 화면은 그 사람이 이 매물의 당사자인지 모르고,
          // 당사자가 아니면 거래 카드가 없으니 링크만으로도 갈림길이 맞다.
          <p className="mt-3 text-label leading-relaxed text-text-2">
            이미 결제한 거래에 문제가 있다면(물건이 오지 않음 · 파손 · 환불){" "}
            <b className="font-bold text-text-1">신고가 아니라</b> 마이페이지 거래 내역의{" "}
            <Link
              href="/mypage"
              className={`font-bold text-text-1 underline underline-offset-2 ${FOCUS_RING}`}
            >
              문의하기
            </Link>
            로 접수해 주세요. 신고로는 결제·환불을 처리할 수 없어요.
          </p>
        ) : (
          // 노쇼 신고는 백엔드에 아직 없다(P4). 여기서 받아 두면 운영팀이 처리할 수단이
          // 없는 신고만 쌓이므로, 지금은 대화로 먼저 확인하도록 안내한다.
          <p className="mt-3 text-label leading-relaxed text-text-2">
            약속 시간에 상대가 오지 않았다면 <b className="font-bold text-text-1">신고가 아니라</b>{" "}
            교환 대화에서 먼저 확인해 주세요. 노쇼 신고는 준비 중이에요.
          </p>
        )}

        <fieldset className="mt-4">
          <legend className="mb-2 text-label font-bold text-text-2">신고 사유 선택 (필수)</legend>
          <div className="flex flex-col gap-2">
            {REPORT_REASON_OPTIONS[targetType].map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-2 rounded-control border px-3 py-2 text-body-s font-semibold transition-colors ${
                  reason === option ? "border-primary font-bold text-text-1" : "border-border text-text-2"
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

        <label className="mt-4 mb-2 block text-label font-bold text-text-2" htmlFor="report-detail">
          상세 내용 (선택)
        </label>
        <textarea
          id="report-detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="구체적인 내용을 입력해주세요. (선택)"
          rows={3}
          className={`w-full resize-none rounded-control border border-border px-3 py-2 text-body-s outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
        />

        <p className="mt-2 text-caption leading-relaxed text-text-3">
          ⓘ 이미 접수한 신고가 있는 경우 새 신고 대신 기존 신고에 신고자로 추가됩니다.
        </p>

        {error && (
          <p role="alert" className="mt-2 rounded-card bg-surface-2 px-3 py-2 text-label font-semibold text-danger">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={`h-10 flex-1 rounded-control border border-border-2 bg-white text-body font-bold text-text-2 transition-colors hover:border-primary disabled:opacity-60 ${FOCUS_RING}`}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!reason || submitting}
            className={`h-10 flex-1 rounded-control bg-accent text-body font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS_RING}`}
          >
            {submitting ? "처리 중..." : "신고 접수"}
          </button>
        </div>
      </div>
    </div>
  );
}
