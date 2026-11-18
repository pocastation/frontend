"use client";

import { useEffect, useState } from "react";
import { ApiError, type ApiFetchOptions } from "@/lib/api";
import { dateTimeLabel } from "@/lib/exchange-labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ExchangeMeetup, ExchangeNoShowReport, ExchangeNoShowView } from "@/lib/types";

/**
 * 노쇼 신고·해명(#824, backend#612).
 *
 * <p>두 갈래로 나눈다. 나를 대상으로 한 신고가 해명 기한 안에 있으면 화면 맨 위 안내 상자(`ExchangeNoShowNotice`)로
 * 세운다. 24시간 안에 답하지 않으면 그대로 기록되는, 이 화면에서 가장 급한 일이라서다. 나머지(신고 버튼, 내가 건
 * 신고, 끝난 신고)는 만남 확인 아래 글줄(`ExchangeNoShowSection`)로 둔다.
 *
 * <p>신고할 수 있는지는 서버의 `reportable`만 따른다. 만남 확인이 된 교환, 완료된 교환은 서버가 받지 않는다.
 */

type FetchWithAuth = <T>(path: string, options?: ApiFetchOptions) => Promise<T>;

/** 서버 {@code ExchangeNoShowReport.MAX_TEXT_LENGTH}와 같다. */
const EXPLANATION_MAX = 500;
/** 서버 {@code ExchangeMeetup.OPENS_BEFORE}. 만남 버튼이 켜지는 시각에서 약속 시각을 거꾸로 구한다. */
const MEETUP_OPENS_BEFORE_MS = 10 * 60 * 1000;
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
        {nickname}님이 약속 장소에서 만나지 못했다고 알려왔어요
      </h2>
      <p className="mt-tight text-body-s text-text-2">
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
        placeholder="예) 약속 시간에 정문 앞에서 기다렸어요. 검은 볼캡을 쓰고 있었어요."
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

/** 내가 건 신고의 한 줄. 상대 해명이 있으면 그 말을 함께 보여 준다. */
function filedLine(report: ExchangeNoShowReport, nickname: string): string {
  switch (report.status) {
    case "PENDING":
      return `${dateTimeLabel(report.explainUntil)}까지 ${nickname}님의 해명을 기다려요. 해명이 없으면 노쇼로 기록돼요.`;
    case "DISPUTED":
      return `${nickname}님이 해명을 보냈어요. 운영팀이 양쪽 이야기를 보고 판단해요.`;
    case "CONFIRMED":
      return `${nickname}님의 노쇼가 기록됐어요.`;
    case "DISMISSED":
      return "운영팀이 검토한 결과 노쇼로 기록하지 않았어요.";
    case "WITHDRAWN":
      return "신고를 철회했어요.";
  }
}

function againstLine(report: ExchangeNoShowReport, nickname: string): string {
  switch (report.status) {
    case "PENDING":
      return "해명 기한이 지났어요. 곧 노쇼 1회로 기록돼요.";
    case "DISPUTED":
      return "해명을 보냈어요. 운영팀이 양쪽 이야기를 보고 판단해요.";
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
  postId,
  noShow,
  meetup,
  nickname,
  fetchWithAuth,
  onChanged,
}: {
  postId: string;
  noShow: ExchangeNoShowView;
  meetup: ExchangeMeetup | null;
  nickname: string;
  fetchWithAuth: FetchWithAuth;
  onChanged: () => Promise<unknown>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { reportable, filedByMe, againstMe } = noShow;

  // 약속 시각이 되면 버튼이 나와야 한다. 판정은 서버가 하므로 그 시각에 다시 묻는다.
  const meetAt =
    meetup && !meetup.confirmed && !filedByMe && !reportable
      ? new Date(meetup.opensAt).getTime() + MEETUP_OPENS_BEFORE_MS
      : null;
  useEffect(() => {
    if (meetAt === null) return;
    const delay = meetAt - Date.now();
    if (delay <= 0 || delay > MAX_TIMER_MS) return;
    const timer = setTimeout(() => void onChanged(), delay + 500);
    return () => clearTimeout(timer);
  }, [meetAt, onChanged]);

  async function post(path: string, failure: string) {
    if (acting) return;
    setActing(true);
    setError(null);
    try {
      await fetchWithAuth(path, { method: "POST" });
      setConfirming(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
    } finally {
      setActing(false);
    }
  }

  // 해명 기한 안의 신고는 맨 위 안내 상자가 맡는다.
  const showAgainst = againstMe && !explainable(againstMe);
  if (!reportable && !filedByMe && !showAgainst) return null;

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

      {filedByMe && (
        <div className={`py-2 ${showAgainst ? "mt-row border-t border-border pt-row" : ""}`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-body-s font-bold text-text-1">내가 한 노쇼 신고</p>
            <span className="shrink-0 text-label font-semibold text-text-2">{STATUS_WORD[filedByMe.status]}</span>
          </div>
          <p className="mt-tight text-body-s text-text-2">{filedLine(filedByMe, nickname)}</p>
          {filedByMe.explanation && (
            <p className="mt-tight whitespace-pre-wrap break-words text-body-s text-text-3">
              {nickname}님의 해명: {filedByMe.explanation}
            </p>
          )}
          {(filedByMe.status === "PENDING" || filedByMe.status === "DISPUTED") && (
            <button
              type="button"
              disabled={acting}
              onClick={() => post(`/api/exchanges/${postId}/no-show/withdraw`, "신고를 철회하지 못했어요.")}
              className={`-mx-2 mt-tight h-12 rounded-control px-2 text-label font-bold text-text-2 underline underline-offset-2 disabled:opacity-60 ${FOCUS_RING}`}
            >
              신고 철회
            </button>
          )}
        </div>
      )}

      {reportable && !filedByMe && (
        <div className={showAgainst ? "mt-row border-t border-border pt-row" : ""}>
          {confirming ? (
            <>
              <p className="text-body-s font-bold text-text-1">{nickname}님을 노쇼로 신고할까요?</p>
              <p className="mt-tight text-body-s text-text-2">
                {nickname}님에게 알림이 가고, 24시간 안에 해명이 없으면 노쇼 1회로 기록돼요. 해명이 오면 운영팀이
                판단해요.
              </p>
              <div className="mt-cta flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={acting}
                  className={`h-12 flex-1 rounded-control border border-border-2 bg-white text-body font-bold text-text-2 disabled:opacity-60 ${FOCUS_RING}`}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => post(`/api/exchanges/${postId}/no-show`, "신고하지 못했어요.")}
                  disabled={acting}
                  className={`h-12 flex-1 rounded-control bg-text-1 text-body font-extrabold text-white disabled:opacity-60 ${FOCUS_RING}`}
                >
                  {acting ? "신고 중..." : "신고하기"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body-s font-bold text-text-1">상대가 오지 않았나요?</p>
                <p className="mt-px text-label text-text-3">약속 시각이 지났는데 만나지 못했다면 알려주세요.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirming(true);
                  setError(null);
                }}
                className={`h-12 shrink-0 rounded-control border border-border-2 bg-white px-3 text-body-s font-bold text-text-1 ${FOCUS_RING}`}
              >
                상대가 안 왔어요
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-tight text-label text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
