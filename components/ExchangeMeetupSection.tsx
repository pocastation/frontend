"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiFetchOptions } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { ExchangeMeetup, ExchangeMeetupCode, ExchangeMeetupConfirmResult } from "@/lib/types";

/**
 * 만남 확인(#819, backend#598).
 *
 * <p>작성자 화면에는 4자리 코드가 나오고, 신청자는 현장에서 그 코드를 받아 자기 화면에 입력한다.
 * 역할을 서버가 {@code codeHolder}로 정해 주므로 화면은 판정하지 않는다.
 *
 * <p>교환 완료와는 별개다. 맞으면 양쪽 모두 「만남 확인됨」으로 바뀌고, 노쇼를 판단할 때 근거로 쓰인다.
 */

const MAX_TIMER_MS = 24 * 60 * 60 * 1000;
/** 작성자 화면이 상대의 입력 결과를 알아채는 주기. 코드를 보여 주는 동안에만 돈다. */
const CONFIRM_POLL_MS = 5000;

function clock(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
}

function remaining(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 지정 시각에 한 번 부른다. 너무 먼 시각은 걸지 않는다(다시 열면 그때 계산한다). */
function useAt(iso: string | null, callback: () => void) {
  useEffect(() => {
    if (!iso) return;
    const delay = new Date(iso).getTime() - Date.now();
    if (delay <= 0 || delay > MAX_TIMER_MS) return;
    const timer = setTimeout(callback, delay + 500);
    return () => clearTimeout(timer);
  }, [iso, callback]);
}

export default function ExchangeMeetupSection({
  postId,
  meetup,
  fetchWithAuth,
  onChanged,
}: {
  postId: string;
  meetup: ExchangeMeetup;
  fetchWithAuth: <T>(path: string, options?: ApiFetchOptions) => Promise<T>;
  /** 대화 응답을 다시 불러온다. 만남 상태의 출처는 그쪽 하나다. */
  onChanged: () => Promise<unknown>;
}) {
  const [revealed, setRevealed] = useState(false);
  const [code, setCode] = useState<ExchangeMeetupCode | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(meetup.lockedUntil);

  const refresh = useCallback(() => {
    void onChanged();
  }, [onChanged]);

  // 서버가 새 잠금 시각을 내려 주면 따라간다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 서버 응답이 바뀔 때만 맞춘다.
    setLockedUntil(meetup.lockedUntil);
  }, [meetup.lockedUntil]);

  // 약속 10분 전이 되면 버튼이 켜져야 한다. open은 서버가 판정하므로 그 시각에 다시 묻는다.
  useAt(!meetup.open && !meetup.confirmed ? meetup.opensAt : null, refresh);
  useAt(lockedUntil, refresh);

  const loadCode = useCallback(async () => {
    try {
      setCode(await fetchWithAuth<ExchangeMeetupCode>(`/api/exchanges/${postId}/meetup/code`));
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "확인 코드를 불러오지 못했어요.");
    }
  }, [fetchWithAuth, postId]);

  const showingCode = meetup.codeHolder && revealed && meetup.open && !meetup.confirmed;

  // 시계. 코드를 보여 주는 동안은 남은 시간을 초 단위로, 그 밖에는 잠금·열림 판정용으로 느리게 돈다.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), showingCode ? 1000 : 15000);
    return () => clearInterval(timer);
  }, [showingCode]);

  // 코드가 바뀌는 시각에 새 코드를 받는다.
  useAt(showingCode && code ? code.expiresAt : null, loadCode);

  // 상대가 입력하면 작성자 화면도 「확인됨」으로 바뀌어야 한다. 보고 있을 때만 묻는다.
  useEffect(() => {
    if (!showingCode) return;
    const timer = setInterval(() => {
      if (!document.hidden) void onChanged();
    }, CONFIRM_POLL_MS);
    return () => clearInterval(timer);
  }, [showingCode, onChanged]);

  async function reveal() {
    setRevealed(true);
    setMessage(null);
    if (meetup.codeHolder) await loadCode();
  }

  async function submit() {
    if (!/^\d{4}$/.test(input) || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await fetchWithAuth<ExchangeMeetupConfirmResult>(`/api/exchanges/${postId}/meetup/confirm`, {
        method: "POST",
        body: { code: input },
      });
      if (result.confirmed) {
        await onChanged();
        return;
      }
      setInput("");
      if (result.lockedUntil) {
        setLockedUntil(result.lockedUntil);
      } else {
        setMessage(`코드가 맞지 않아요. ${result.remainingAttempts}번 더 입력할 수 있어요.`);
      }
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "코드를 확인하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  const locked = lockedUntil !== null && new Date(lockedUntil).getTime() > now;
  const beforeOpen = !meetup.open && !meetup.confirmed && new Date(meetup.opensAt).getTime() > now;

  return (
    <section className="mt-section-ruled border-t border-border px-gutter pt-section-ruled" aria-labelledby="meetup-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="meetup-title" className="text-body-l font-extrabold text-text-1">
          만남 확인
        </h2>
        {meetup.confirmed && <span className="shrink-0 text-body-s font-extrabold text-text-1">만남 확인됨</span>}
      </div>

      {meetup.confirmed ? (
        <p className="mt-tight text-body-s text-text-2">
          {meetup.confirmedAt ? `${clock(meetup.confirmedAt)}에 ` : ""}두 사람이 만난 것으로 기록됐어요.
        </p>
      ) : beforeOpen ? (
        <>
          <p className="mt-tight text-body-s text-text-2">
            현장에서 {meetup.codeHolder ? "내 화면의 코드를 상대에게 보여주면" : "상대 화면의 코드를 입력하면"} 만남이
            기록돼요.
          </p>
          <button
            type="button"
            disabled
            className="mt-cta h-12 w-full rounded-control bg-surface-2 text-body-l font-extrabold text-text-3"
          >
            만남 확인
          </button>
          <p className="mt-tight text-label text-text-3">약속 10분 전({clock(meetup.opensAt)})부터 누를 수 있어요.</p>
        </>
      ) : !meetup.open ? (
        <p className="mt-tight text-body-s text-text-3">만남을 확인할 수 있는 기간이 지났어요.</p>
      ) : !revealed ? (
        <>
          <p className="mt-tight text-body-s text-text-2">
            {meetup.codeHolder
              ? "상대를 만나면 버튼을 눌러 나오는 코드 4자리를 보여주세요."
              : "상대를 만나면 버튼을 누르고 상대 화면의 코드 4자리를 입력하세요."}
          </p>
          <button
            type="button"
            onClick={reveal}
            className={`mt-cta h-12 w-full rounded-control bg-primary text-body-l font-extrabold text-white ${FOCUS_RING}`}
          >
            만남 확인
          </button>
        </>
      ) : meetup.codeHolder ? (
        <div className="mt-head">
          {code ? (
            <>
              <p className="text-body-s text-text-2">신청자에게 이 코드를 보여주세요.</p>
              <p
                aria-label={`확인 코드 ${code.code.split("").join(" ")}`}
                className="mt-head flex justify-center gap-2"
              >
                {code.code.split("").map((digit, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="flex h-16 w-14 items-center justify-center rounded-control border border-border-2 font-display text-display font-extrabold text-text-1"
                  >
                    {digit}
                  </span>
                ))}
              </p>
              <p className="mt-tight text-center font-display text-label text-text-3">
                {remaining(new Date(code.expiresAt).getTime() - now)} 뒤 새 코드로 바뀌어요
              </p>
            </>
          ) : (
            !message && <p className="text-body-s text-text-3">코드를 불러오는 중이에요.</p>
          )}
        </div>
      ) : (
        <div className="mt-head">
          <label htmlFor="meetup-code" className="text-body-s font-bold text-text-1">
            상대 화면의 코드 4자리
          </label>
          <div className="mt-tight flex gap-2">
            <input
              id="meetup-code"
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) void submit();
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              disabled={locked}
              placeholder="0000"
              className="h-12 min-w-0 flex-1 rounded-control border border-border-2 px-4 font-display text-body-l text-text-1 outline-none placeholder:text-text-3 focus:border-primary disabled:bg-surface-2"
            />
            <button
              type="button"
              onClick={submit}
              disabled={input.length !== 4 || submitting || locked}
              className={`h-12 shrink-0 rounded-control bg-primary px-5 text-body-l font-extrabold text-white disabled:opacity-40 ${FOCUS_RING}`}
            >
              {submitting ? "확인 중..." : "확인"}
            </button>
          </div>
          {locked && lockedUntil ? (
            <p role="alert" className="mt-tight text-label text-danger">
              코드를 5번 틀려 {clock(lockedUntil)}까지 입력할 수 없어요.
            </p>
          ) : (
            !message && <p className="mt-tight text-label text-text-3">코드는 5분마다 바뀌어요. 5번 틀리면 잠시 입력이 막혀요.</p>
          )}
        </div>
      )}

      {message && (
        <p role="alert" className="mt-tight text-label text-danger">
          {message}
        </p>
      )}
    </section>
  );
}
