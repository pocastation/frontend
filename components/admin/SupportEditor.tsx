"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export const field = "mt-1 block w-full rounded-control border border-border-2 bg-white px-3 py-2 text-body";
export const button = "rounded-control border border-border-2 bg-white px-3 py-2 text-body-s font-bold hover:border-primary disabled:opacity-50";
export const primary = "rounded-control bg-primary px-4 py-2 text-body-s font-bold text-white hover:bg-primary-dark disabled:opacity-50";

export function useSupportList<T>(path: string) {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    fetchWithAuth<T>(path).then(value => {
      if (active) { setData(value); setError(""); }
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : "목록을 불러오지 못했어요."); });
    return () => { active = false; };
  }, [fetchWithAuth, path, generation]);
  return { data, setData, error, reload: () => setGeneration(n => n + 1) };
}

export function useSupportConfirmation() {
  const [pending, setPending] = useState<{ question: string; save: () => Promise<void> } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (pending) dialog.current?.showModal();
  }, [pending]);

  function ask(question: string, save: () => Promise<void>) {
    setMessage("");
    setPending({ question, save });
  }
  function close() {
    dialog.current?.close();
    setPending(null);
  }
  async function confirm() {
    if (!pending || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await pending.save();
      setMessage("변경사항을 저장했어요.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      close();
      lock.current = false;
      setBusy(false);
    }
  }
  const confirmation = <>
    <p role="status" className="my-2 text-body-s">{message}</p>
    <dialog ref={dialog} aria-label="변경 확인" onCancel={e => { if (lock.current) e.preventDefault(); else setPending(null); }}
      className="m-auto w-[min(90vw,26rem)] rounded-card bg-white p-6 shadow-card backdrop:bg-black/40">
      <p className="break-words text-body-l font-bold">{pending?.question}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" autoFocus disabled={busy} className={button} onClick={close}>아니오</button>
        <button type="button" disabled={busy} className={primary} onClick={confirm}>{busy ? "저장 중…" : "예"}</button>
      </div>
    </dialog>
  </>;
  return { ask, confirmation };
}
