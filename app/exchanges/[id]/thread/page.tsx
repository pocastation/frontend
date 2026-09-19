"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { slotLabel } from "@/lib/exchange-labels";
import { FOCUS_RING } from "@/lib/ui";
import type {
  ExchangeMessage,
  ExchangeMessageListResponse,
  ExchangeThreadResponse,
} from "@/lib/types";

/**
 * 확정 교환의 1:1 대화(#669).
 *
 * <p><b>약속이 대화 위에 붙박여 있다.</b> 현장에서 열었을 때 위로 스크롤해 장소를 찾게 하면 안 된다.
 *
 * <p>완료 확인은 입력창 바로 위에 붙는다. 대화를 떠나 교환글로 돌아가 누르게 하면 아무도 안 누른다.
 */

/** 3초. 사람이 「안 오네」 하고 다시 보기 전에 와 있으면 충분하다. */
const POLL_MS = 3000;

function hhmm(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function ExchangeThreadPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const router = useRouter();
  const { member, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [thread, setThread] = useState<ExchangeThreadResponse | null>(null);
  const [messages, setMessages] = useState<ExchangeMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  // 폴링이 항상 최신 커서를 보게 한다. 상태로 읽으면 인터벌이 만들어질 때 값이 굳는다.
  const lastIdRef = useRef<number>(0);

  useEffect(() => {
    if (authLoading) return;
    if (!member) {
      router.replace(`/login?redirect=${encodeURIComponent(`/exchanges/${postId}/thread`)}`);
    }
  }, [authLoading, member, postId, router]);

  const applyMessages = useCallback((incoming: ExchangeMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const added = incoming.filter((m) => !known.has(m.id));
      return added.length === 0 ? prev : [...prev, ...added];
    });
    lastIdRef.current = Math.max(lastIdRef.current, ...incoming.map((m) => m.id));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth<ExchangeThreadResponse>(`/api/exchanges/${postId}/thread`);
      setThread(res);
      setMessages(res.messages);
      lastIdRef.current = res.messages.reduce((max, m) => Math.max(max, m.id), 0);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "대화를 불러오지 못했어요.");
    }
  }, [fetchWithAuth, postId]);

  useEffect(() => {
    if (authLoading || !member) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 첫 진입에 한 번 불러온다. load는 async라 setState는 await 뒤에 일어난다.
    void load();
  }, [authLoading, member, load]);

  /**
   * 폴링. <b>보고 있지 않으면 멈춘다.</b> 열어 둔 채 잊은 화면이 하루 종일 두드리는 것을 막는다.
   * 잠긴 대화도 돌지 않는다 — 새 메시지가 생길 수 없다.
   */
  useEffect(() => {
    if (!thread || !thread.writable) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetchWithAuth<ExchangeMessageListResponse>(
          `/api/exchange-threads/${thread.id}/messages?after=${lastIdRef.current}`,
        );
        applyMessages(res.messages);
      } catch {
        // 한 번 실패해도 다음 주기에 같은 커서로 다시 묻는다. 끊겨도 복구된다.
      }
    };

    const start = () => {
      if (timer === null) timer = setInterval(poll, POLL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
        return;
      }
      void poll();
      start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [thread, fetchWithAuth, applyMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || sending || !thread) return;
    setSending(true);
    setError(null);
    try {
      const sent = await fetchWithAuth<ExchangeMessage>(`/api/exchange-threads/${thread.id}/messages`, {
        method: "POST",
        body: { body },
      });
      applyMessages([sent]);
      setDraft("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "메시지를 보내지 못했어요.");
    } finally {
      setSending(false);
    }
  }

  async function act(path: string, failure: string) {
    if (acting) return;
    setActing(true);
    setError(null);
    try {
      await fetchWithAuth<void>(path, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
    } finally {
      setActing(false);
    }
  }

  if (loadError) {
    return (
      <>
        <MobilePageHead title="교환 대화" backHref={`/exchanges/${postId}`} />
        <p className="px-[14px] py-16 text-center text-[12.5px] text-text-3">{loadError}</p>
      </>
    );
  }

  const completion = thread?.completion;

  return (
    <>
      <MobilePageHead
        title={thread?.counterpartNickname ?? "교환 대화"}
        sub="교환 확정"
        backHref={`/exchanges/${postId}`}
      />

      <div className="mx-auto flex min-h-[calc(100dvh-48px)] max-w-[640px] flex-col">
        {/* 현장에서 열었을 때 장소를 찾아 스크롤하지 않게 머리에 붙박아 둔다. */}
        {thread && (
          <div className="sticky top-12 z-[2] flex items-center gap-2.5 border-b border-border bg-surface-2 px-[14px] py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-extrabold tracking-[-0.015em] text-text-1">{thread.place}</p>
              {thread.slot && <p className="mt-px text-[11.5px] text-text-2">{slotLabel(thread.slot)}</p>}
            </div>
            <Link href={`/exchanges/${postId}`} className={`shrink-0 text-[11.5px] font-bold text-primary ${FOCUS_RING}`}>
              교환글 →
            </Link>
          </div>
        )}

        <div className="flex-1 px-[14px] py-3.5">
          {messages.map((message, index) => {
            const showDay = index === 0 || dayLabel(messages[index - 1].createdAt) !== dayLabel(message.createdAt);
            return (
              <div key={message.id}>
                {showDay && (
                  <p className="mb-3 mt-1 text-center text-[11px] text-text-3">{dayLabel(message.createdAt)}</p>
                )}
                <div className={`mb-2 flex ${message.mine ? "justify-end" : ""}`}>
                  {message.mine && (
                    <span className="mr-1.5 self-end text-[10.5px] text-text-3">{hhmm(message.createdAt)}</span>
                  )}
                  <p
                    className={`max-w-[250px] whitespace-pre-wrap break-words px-3 py-2.5 text-sm leading-normal ${
                      message.mine
                        ? "rounded-[12px_12px_3px_12px] bg-primary text-white"
                        : "rounded-[12px_12px_12px_3px] bg-surface-2 text-text-1"
                    }`}
                  >
                    {message.body}
                  </p>
                  {!message.mine && (
                    <span className="ml-1.5 self-end text-[10.5px] text-text-3">{hhmm(message.createdAt)}</span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p role="alert" className="mx-[14px] mb-2 rounded-r1 border-l-2 border-danger bg-danger-soft px-3 py-2 text-[12.5px] font-semibold text-danger">
            {error}
          </p>
        )}

        {/* 완료 확인 — 상태가 다섯이고 한 번에 하나만 보인다. */}
        {completion && (completion.confirmable || completion.confirmed || !thread?.writable) && (
          <div className="border-t border-border px-[14px] py-2.5">
            {completion.confirmed && completion.disputed ? (
              <p className="text-[13px] leading-relaxed text-text-2">
                교환이 이뤄지지 않은 것으로 정리됐어요. 기록은 남지 않아요.
              </p>
            ) : completion.confirmed && completion.confirmedByMe ? (
              <p className="text-[13px] leading-relaxed text-text-2">
                교환 완료로 확인했어요. 상대가 이의 없이 24시간이 지나면 기록에 남아요.
              </p>
            ) : completion.confirmed ? (
              <>
                <p className="text-[13px] leading-relaxed text-text-2">
                  {thread?.counterpartNickname ?? "상대"}님이 <b className="font-bold text-text-1">교환 완료를 확인</b>했어요.
                  사실과 다르면 알려주세요.
                </p>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => act(`/api/exchanges/${postId}/completion/dispute`, "이의를 보내지 못했어요.")}
                  className={`mt-2 h-10 w-full rounded-[7px] border border-border-2 bg-white text-[13.5px] font-extrabold text-text-2 disabled:opacity-60 ${FOCUS_RING}`}
                >
                  교환이 이뤄지지 않았어요
                </button>
              </>
            ) : completion.confirmable ? (
              <>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => act(`/api/exchanges/${postId}/completion`, "완료 확인에 실패했어요.")}
                  className={`h-11 w-full rounded-[7px] border border-text-1 bg-white text-[14.5px] font-extrabold text-text-1 disabled:opacity-60 ${FOCUS_RING}`}
                >
                  교환 완료 확인
                </button>
                <p className="mt-1.5 text-[11px] leading-relaxed text-text-3">
                  한 분만 눌러도 완료돼요. 상대는 24시간 안에 아니라고 알릴 수 있어요.
                </p>
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-text-3">
                행사가 끝나고 3일이 지나 대화가 잠겼어요. 지난 대화는 계속 볼 수 있어요.
              </p>
            )}
          </div>
        )}

        {thread?.writable && (
          <div className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-white px-[14px] py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
              maxLength={500}
              aria-label="메시지"
              placeholder="메시지 입력"
              className={`h-11 min-w-0 flex-1 rounded-[22px] border border-border-2 px-4 text-[15px] outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim() || sending}
              aria-label="보내기"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40 ${FOCUS_RING}`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
