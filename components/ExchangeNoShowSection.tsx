"use client";

import { useEffect, useState } from "react";
import { ApiError, type ApiFetchOptions } from "@/lib/api";
import { dateTimeLabel } from "@/lib/exchange-labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ExchangeNoShowReport, ExchangeNoShowView } from "@/lib/types";

/**
 * 노쇼 신고·해명(#824, backend#612, backend#649).
 *
 * <p>신고는 행사가 끝날 때까지 만남 확인 코드가 맞지 않으면 양쪽에 자동으로 걸린다. 사용자가 직접 거는 버튼은 없다.
 *
 * <p>두 갈래로 나눈다. 나를 대상으로 한 신고가 해명 기한 안에 있으면 화면 맨 위 안내 상자(`ExchangeNoShowNotice`)로
 * 세운다. 24시간 안에 답하지 않으면 그대로 기록되는, 이 화면에서 가장 급한 일이라서다. 나머지(상대의 해명 상태,
 * 끝난 신고)는 만남 확인 아래 글줄(`ExchangeNoShowSection`)로 둔다.
 */

type FetchWithAuth = <T>(path: string, options?: ApiFetchOptions) => Promise<T>;

/** 서버 {@code ExchangeNoShowReport.MAX_TEXT_LENGTH}와 같다. */
const EXPLANATION_MAX = 500;
const MAX_TIMER_MS = 24 * 60 * 60 * 1000;

/** 해명 기한 안의 신고인가. 기한이 지나면 서버 스위퍼가 곧 노쇼로 확정한다. */
export function explainable(report: ExchangeNoShowReport | null | undefined, now = Date.now()): boolean {
  return report?.status === "PENDING" && new Date(report.explainUntil).getTime() > now;
}

export function ExchangeNoShowNotice({
  postId,
  report,
  nickname,
  fetchWithAuth,
  onChanged,
}: {
  postId: string;
  report: ExchangeNoShowReport;
  nickname: string;
  fetchWithAuth: FetchWithAuth;
  onChanged: () => Promise<unknown>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 기한이 지나면 입력을 거둬야 한다. 화면을 켜 둔 채 넘기면 보내도 거절된다.
  useEffect(() => {
    const delay = new Date(report.explainUntil).getTime() - Date.now();
    if (delay <= 0 || delay > MAX_TIMER_MS) return;
    const timer = setTimeout(() => void onChanged(), delay + 500);
    return () => clearTimeout(timer);
  }, [report.explainUntil, onChanged]);

  async function send() {
    const explanation = draft.trim();
    if (!explanation || sending) return;
    setSending(true);
    setError(null);
    try {
      await fetchWithAuth(`/api/exchanges/${postId}/no-show/explanation`, {
        method: "POST",
        body: { explanation },
      });
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "해명을 보내지 못했어요.");
      setSending(false);
    }
  }

  return (
    <section className="mx-gutter mt-page rounded-card bg-surface-2 p-card" aria-labelledby="no-show-notice-title">
      <h2 id="no-show-notice-title" className="text-body-l font-extrabold text-text-1">
        {report.autoFiled
          ? "행사가 끝날 때까지 만남 확인 코드가 입력되지 않았어요"
          : `${nickname}님이 약속 장소에서 만나지 못했다고 알려왔어요`}
      </h2>
      <p className="mt-tight text-body-s text-text-2">
        {report.autoFiled && "두 사람 모두에게 노쇼 신고가 접수됐어요. "}
        <span className="font-bold text-danger">{dateTimeLabel(report.explainUntil)}</span>까지 해명하지 않으면 노쇼
        1회로 기록돼요. 해명을 보내면 운영팀이 양쪽 이야기를 보고 판단해요.
      </p>

      <label htmlFor="no-show-explanation" className="mt-group block text-body-s font-bold text-text-1">
        해명
      </label>
      <textarea
        id="no-show-explanation"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={EXPLANATION_MAX}
        rows={3}
        placeholder="예) 약속 시간에 정문 앞에서 만나 교환했는데 코드 입력을 잊었어요."
        className="mt-tight block w-full resize-none rounded-control border border-border-2 bg-white px-3 py-3 text-body-l text-text-1 outline-none placeholder:text-text-3 focus:border-primary"
      />
      <div className="mt-tight flex items-center justify-between gap-3">
        <p className="text-label text-text-3">만난 장소·시간처럼 확인할 수 있는 내용을 적어주세요.</p>
        <span className="shrink-0 font-display text-label text-text-3">
          {draft.length} / {EXPLANATION_MAX}
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-tight text-label text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={send}
        disabled={!draft.trim() || sending}
        className={`mt-cta h-12 w-full rounded-control bg-primary text-body-l font-extrabold text-white disabled:opacity-40 ${FOCUS_RING}`}
      >
        {sending ? "보내는 중..." : "해명 보내기"}
      </button>
    </section>
  );
}

/** 상대를 대상으로 한 신고의 한 줄. 상대 해명이 있으면 그 말을 함께 보여 준다. */
function counterpartLine(report: ExchangeNoShowReport, nickname: string): string {
  switch (report.status) {
    case "PENDING":
      return `${dateTimeLabel(report.explainUntil)}까지 ${nickname}님의 해명을 기다려요. 해명이 없으면 노쇼로 기록돼요.`;
    case "DISPUTED":
      return `${nickname}님이 해명을 보냈어요. 운영팀이 판단해요.`;
    case "CONFIRMED":
      return `${nickname}님의 노쇼가 기록됐어요.`;
    case "DISMISSED":
      return `운영팀이 검토한 결과 ${nickname}님을 노쇼로 기록하지 않았어요.`;
    case "WITHDRAWN":
      return "신고를 철회했어요.";
  }
}

function againstLine(report: ExchangeNoShowReport, nickname: string): string {
  switch (report.status) {
    case "PENDING":
      return "해명 기한이 지났어요. 곧 노쇼 1회로 기록돼요.";
    case "DISPUTED":
      return "해명을 보냈어요. 운영팀이 판단해요.";
    case "CONFIRMED":
      return "노쇼 1회로 기록됐어요. 90일 안에 2번 기록되면 30일 동안 교환을 이용할 수 없어요.";
    case "DISMISSED":
      return "운영팀이 검토한 결과 노쇼로 기록하지 않았어요.";
    case "WITHDRAWN":
      return `${nickname}님이 노쇼 신고를 철회했어요.`;
  }
}

const STATUS_WORD: Record<ExchangeNoShowReport["status"], string> = {
  PENDING: "해명 대기",
  DISPUTED: "운영팀 검토 중",
  CONFIRMED: "노쇼 기록됨",
  DISMISSED: "기록 안 함",
  WITHDRAWN: "철회됨",
};

export default function ExchangeNoShowSection({
  noShow,
  nickname,
}: {
  noShow: ExchangeNoShowView;
  nickname: string;
}) {
  const { againstMe, againstCounterpart } = noShow;

  // 해명 기한 안의 신고는 맨 위 안내 상자가 맡는다.
  const showAgainst = againstMe && !explainable(againstMe);
  if (!showAgainst && !againstCounterpart) return null;

  return (
    <section className="mt-section-ruled border-t border-border px-gutter pt-section-ruled" aria-label="노쇼 신고">
      {showAgainst && (
        <div className="py-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-body-s font-bold text-text-1">나에 대한 노쇼 신고</p>
            <span className="shrink-0 text-label font-semibold text-text-2">{STATUS_WORD[againstMe.status]}</span>
          </div>
          <p className="mt-tight text-body-s text-text-2">{againstLine(againstMe, nickname)}</p>
          {againstMe.explanation && (
            <p className="mt-tight whitespace-pre-wrap break-words text-body-s text-text-3">
              내 해명: {againstMe.explanation}
            </p>
          )}
        </div>
      )}

      {againstCounterpart && (
        <div className={`py-2 ${showAgainst ? "mt-row border-t border-border pt-row" : ""}`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-body-s font-bold text-text-1">{nickname}님에 대한 노쇼 신고</p>
            <span className="shrink-0 text-label font-semibold text-text-2">
              {STATUS_WORD[againstCounterpart.status]}
            </span>
          </div>
          <p className="mt-tight text-body-s text-text-2">{counterpartLine(againstCounterpart, nickname)}</p>
          {againstCounterpart.explanation && (
            <p className="mt-tight whitespace-pre-wrap break-words text-body-s text-text-3">
              {nickname}님의 해명: {againstCounterpart.explanation}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
