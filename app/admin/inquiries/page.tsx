"use client";

import { useCallback, useEffect, useState } from "react";
import InquiryStatusBadge from "@/components/InquiryStatusBadge";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatInquiryDate, INQUIRY_CATEGORY_LABEL } from "@/lib/inquiries";
import { FOCUS_RING } from "@/lib/ui";
import type {
  AdminInquiryListResponse,
  AdminInquiryResponse,
  InquiryStatus,
} from "@/lib/types";

type Filter = InquiryStatus | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "RECEIVED", label: "접수완료" },
  { value: "CHECKING", label: "확인중" },
  { value: "ANSWERED", label: "답변완료" },
  { value: "ALL", label: "전체" },
];

const PAGE_SIZE = 30;

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export default function AdminInquiriesPage() {
  const { fetchWithAuth } = useAuth();
  const [filter, setFilter] = useState<Filter>("RECEIVED");
  const [items, setItems] = useState<AdminInquiryResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (filter !== "ALL") params.set("status", filter);
    try {
      const result = await fetchWithAuth<AdminInquiryListResponse>(
        "/api/admin/inquiries?" + params.toString(),
      );
      const lastPage = Math.max(result.totalPages - 1, 0);
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setItems(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
      const nextSelected = result.content.find((item) => item.id === selectedId) ?? null;
      setSelectedId(nextSelected?.id ?? null);
      setAnswer(nextSelected?.answer ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "문의 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, filter, page, selectedId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 관리자 상태 필터가 바뀌면 서버 목록을 동기화한다.
    void load();
    // selectedId 변경은 사용자의 행 선택이므로 재조회 조건에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWithAuth, filter, page]);

  function selectInquiry(item: AdminInquiryResponse) {
    setSelectedId(item.id);
    setAnswer(item.answer ?? "");
    setNotice(null);
  }

  async function markChecking() {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    try {
      await fetchWithAuth<AdminInquiryResponse>("/api/admin/inquiries/" + selected.id + "/status", {
        method: "PATCH",
        body: { status: "CHECKING" },
      });
      setNotice("확인중으로 변경했습니다.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "상태를 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !answer.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      await fetchWithAuth<AdminInquiryResponse>("/api/admin/inquiries/" + selected.id + "/answer", {
        method: "PUT",
        body: { answer: answer.trim() },
      });
      setNotice(selected.status === "ANSWERED" ? "답변을 수정했습니다." : "답변을 등록했습니다.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "답변을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-xl font-extrabold text-text-1">문의 관리</h1>
        <p className="mt-1 text-sm text-text-3">접수된 1:1 문의를 확인하고 답변을 등록해요.</p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="문의 상태 필터">
        {FILTERS.map((item) => {
          const active = filter === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setSelectedId(null);
                setAnswer("");
                setPage(0);
                setFilter(item.value);
              }}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                FOCUS_RING +
                (active
                  ? " border-primary bg-primary text-white"
                  : " border-border text-text-2 hover:border-primary hover:text-primary")
              }
            >
              {item.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-text-3">총 {totalElements}건</span>
      </div>

      {notice && (
        <p role="status" className="mb-3 rounded-r2 bg-primary-soft px-3 py-2 text-sm font-semibold text-primary">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 rounded-r2 bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">
          {error}
        </p>
      )}

      <div className="min-h-[560px] overflow-hidden rounded-r3 border border-border bg-surface lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
        <section
          className={(selected ? "hidden lg:block" : "block") + " border-b border-border lg:border-b-0 lg:border-r"}
          aria-label="문의 목록"
        >
          {loading ? (
            <p className="py-20 text-center text-sm text-text-3">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-sm text-text-3">해당 상태의 문의가 없어요.</p>
          ) : (
            <>
              <ul className="max-h-[504px] overflow-y-auto">
              {items.map((item) => {
                const active = item.id === selectedId;
                return (
                  <li key={item.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => selectInquiry(item)}
                      className={
                        "w-full px-4 py-4 text-left transition-colors " +
                        FOCUS_RING +
                        (active ? " bg-primary-soft/70" : " hover:bg-surface-2")
                      }
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-primary">
                          {INQUIRY_CATEGORY_LABEL[item.category]}
                        </span>
                        <InquiryStatusBadge status={item.status} />
                      </span>
                      <span className="mt-2 block truncate text-sm font-bold text-text-1">{item.title}</span>
                      <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-text-3">
                        <span className="truncate">{item.memberNickname ?? "알 수 없는 회원"}</span>
                        <span className="shrink-0">{formatInquiryDate(item.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              </ul>
              {totalPages > 1 && (
                <nav
                  className="flex h-14 items-center justify-between border-t border-border px-3"
                  aria-label="문의 목록 페이지"
                >
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => {
                      setSelectedId(null);
                      setAnswer("");
                      setNotice(null);
                      setPage((current) => current - 1);
                    }}
                    className={
                      "h-8 rounded-r2 px-2.5 text-xs font-bold text-text-2 hover:text-primary disabled:opacity-35 " +
                      FOCUS_RING
                    }
                  >
                    이전
                  </button>
                  <span className="text-xs tabular-nums text-text-3">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page + 1 >= totalPages}
                    onClick={() => {
                      setSelectedId(null);
                      setAnswer("");
                      setNotice(null);
                      setPage((current) => current + 1);
                    }}
                    className={
                      "h-8 rounded-r2 px-2.5 text-xs font-bold text-text-2 hover:text-primary disabled:opacity-35 " +
                      FOCUS_RING
                    }
                  >
                    다음
                  </button>
                </nav>
              )}
            </>
          )}
        </section>

        <section className={(selected ? "block" : "hidden lg:block") + " min-w-0"} aria-label="문의 상세 및 답변">
          {!selected ? (
            <div className="flex min-h-[360px] items-center justify-center px-6 text-center text-sm text-text-3">
              확인할 문의를 선택해 주세요.
            </div>
          ) : (
            <div>
              <div className="border-b border-border px-4 py-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setAnswer("");
                    setNotice(null);
                  }}
                  className={
                    "inline-flex h-9 items-center gap-1 text-sm font-bold text-text-2 hover:text-primary " + FOCUS_RING
                  }
                >
                  <ArrowLeftIcon />
                  문의 목록
                </button>
              </div>
              <div className="border-b border-border px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-primary">
                    {INQUIRY_CATEGORY_LABEL[selected.category]}
                  </span>
                  <InquiryStatusBadge status={selected.status} />
                </div>
                <h2 className="mt-3 break-words text-lg font-extrabold text-text-1">{selected.title}</h2>
                <p className="mt-1 text-xs text-text-3">
                  {selected.memberNickname ?? "알 수 없는 회원"} · {formatInquiryDate(selected.createdAt)}
                </p>
              </div>

              <div className="border-b border-border px-5 py-6 sm:px-6">
                <h3 className="text-xs font-extrabold text-text-3">문의 내용</h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-text-2">{selected.content}</p>
              </div>

              <form className="px-5 py-6 sm:px-6" onSubmit={submitAnswer}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="admin-inquiry-answer" className="text-sm font-extrabold text-text-1">
                    답변
                  </label>
                  <span className="text-xs tabular-nums text-text-3">{answer.length}/3,000</span>
                </div>
                <textarea
                  id="admin-inquiry-answer"
                  rows={8}
                  maxLength={3000}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="사용자에게 전달할 답변을 입력해 주세요."
                  className={
                    "min-h-[180px] w-full resize-y rounded-r2 border border-border-2 p-3.5 text-sm leading-relaxed text-text-1 outline-none placeholder:text-text-3 focus:border-primary " +
                    FOCUS_RING
                  }
                />
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {selected.status === "RECEIVED" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={markChecking}
                      className={
                        "h-10 rounded-r2 border border-border-2 bg-white px-4 text-sm font-bold text-text-2 hover:border-primary hover:text-primary disabled:opacity-50 " +
                        FOCUS_RING
                      }
                    >
                      확인 시작
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={busy || !answer.trim()}
                    className={
                      "h-10 rounded-r2 bg-primary px-5 text-sm font-extrabold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-45 " +
                      FOCUS_RING
                    }
                  >
                    {busy ? "저장 중..." : selected.status === "ANSWERED" ? "답변 수정" : "답변 등록"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
