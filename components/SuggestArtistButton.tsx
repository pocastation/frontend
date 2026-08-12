"use client";

import { useId, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SUGGESTION_KIND_LABEL, SUGGESTION_KIND_OPTIONS } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { SuggestionKind } from "@/lib/types";

// /artists 하단 CTA — 찾는 아티스트/기획사/멤버가 없으면 건의. 비로그인은 로그인으로 유도.
export default function SuggestArtistButton() {
  const { accessToken, fetchWithAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const nameId = useId();
  const noteId = useId();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SuggestionKind>("ARTIST");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  function openModal() {
    if (!accessToken) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setError(null);
    setName("");
    setNote("");
    setKind("ARTIST");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchWithAuth<void>("/api/catalog/suggestions", {
        method: "POST",
        body: { kind, name: name.trim(), note: note.trim() || null },
      });
      setOpen(false);
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "건의를 보내지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mt-8 flex flex-col items-center gap-2 rounded-r3 border border-dashed border-border-2 py-8 text-center">
        <p className="text-sm font-bold text-text-2">찾는 스타·기획사·멤버가 없나요?</p>
        <p className="text-xs text-text-3">등록을 건의하면 검토 후 추가해드려요.</p>
        <button
          type="button"
          onClick={openModal}
          className={`mt-1 rounded-full border border-border-2 bg-white px-4 py-2 text-sm font-bold text-text-2 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
        >
          등록 건의하기
        </button>
        {justSubmitted && (
          <p role="status" className="text-xs font-semibold text-ok">
            건의를 보냈어요. 검토 후 반영할게요!
          </p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="등록 건의"
        >
          <form onSubmit={submit} className="w-full max-w-sm rounded-r3 bg-surface p-5 shadow-modal">
            <h2 className="font-display text-base font-extrabold text-text-1">등록 건의</h2>
            <p className="mt-1 text-xs text-text-3">추가됐으면 하는 스타·기획사·멤버를 알려주세요.</p>

            <fieldset className="mt-4">
              <legend className="mb-1.5 text-xs font-bold text-text-2">종류</legend>
              <div className="flex gap-1.5">
                {SUGGESTION_KIND_OPTIONS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                    className={`flex-1 rounded-r2 border px-2 py-2 text-sm font-semibold transition-colors ${FOCUS_RING} ${
                      kind === k
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-text-2 hover:border-primary"
                    }`}
                  >
                    {SUGGESTION_KIND_LABEL[k]}
                  </button>
                ))}
              </div>
            </fieldset>

            <label htmlFor={nameId} className="mt-4 mb-1.5 block text-xs font-bold text-text-2">
              이름
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder={kind === "MEMBER" ? "멤버 이름" : kind === "AGENCY" ? "기획사 이름" : "그룹/솔로 이름"}
              className={`w-full rounded-r2 border border-border px-3.5 py-2.5 text-sm text-text-1 outline-none focus:border-primary ${FOCUS_RING}`}
            />

            <label htmlFor={noteId} className="mt-3 mb-1.5 block text-xs font-bold text-text-2">
              비고 <span className="font-normal text-text-3">(선택)</span>
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="소속 그룹·기획사 등 참고할 내용을 적어주세요."
              className={`w-full resize-none rounded-r2 border border-border px-3.5 py-2.5 text-sm text-text-1 outline-none focus:border-primary ${FOCUS_RING}`}
            />

            {error && (
              <p role="alert" className="mt-3 rounded-r2 bg-accent-soft px-3 py-2 text-xs font-semibold text-accent">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`h-10 flex-1 rounded-full border border-border-2 bg-white text-sm font-bold text-text-2 ${FOCUS_RING}`}
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={!name.trim() || submitting}
                className={`h-10 flex-1 rounded-full bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
              >
                {submitting ? "보내는 중..." : "건의하기"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
