"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/format";
import {
  SUGGESTION_KIND_LABEL,
  SUGGESTION_STATUS_TONE,
  SUGGESTION_STATUS_LABEL,
} from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminSuggestionListResponse, AdminSuggestionResponse, SuggestionStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const STATUS_FILTERS: { value: SuggestionStatus | "ALL"; label: string }[] = [
  { value: "RECEIVED", label: "접수" },
  { value: "ACCEPTED", label: "반영" },
  { value: "REJECTED", label: "반려" },
  { value: "ALL", label: "전체" },
];

const PAGE_SIZE = 20;

export default function AdminSuggestionsPage() {
  const { fetchWithAuth } = useAuth();
  const [filter, setFilter] = useState<SuggestionStatus | "ALL">("RECEIVED");
  const [items, setItems] = useState<AdminSuggestionResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const buildParams = useCallback(
    (p: number) => {
      const params = new URLSearchParams({ page: String(p), size: String(PAGE_SIZE) });
      if (filter !== "ALL") params.set("status", filter);
      return params;
    },
    [filter],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth<AdminSuggestionListResponse>(
        `/api/admin/catalog/suggestions?${buildParams(0)}`,
      );
      setItems(res.content);
      setPage(0);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "건의를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [buildParams, fetchWithAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 필터 변경 시 목록 재조회
    void load();
  }, [load]);

  async function loadMore() {
    const next = page + 1;
    try {
      const res = await fetchWithAuth<AdminSuggestionListResponse>(
        `/api/admin/catalog/suggestions?${buildParams(next)}`,
      );
      setItems((prev) => [...prev, ...res.content]);
      setPage(next);
      setTotalPages(res.totalPages);
    } catch {
      setError("더 불러오지 못했어요.");
    }
  }

  async function resolve(id: number, status: "ACCEPTED" | "REJECTED") {
    setBusyId(id);
    setNotice(null);
    try {
      await fetchWithAuth<void>(`/api/admin/catalog/suggestions/${id}`, {
        method: "PATCH",
        body: { status },
      });
      setNotice(status === "ACCEPTED" ? "반영 처리했어요." : "반려 처리했어요.");
      await load();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "처리하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  const hasMore = page + 1 < totalPages;

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-xl font-extrabold text-text-1">건의 관리</h1>
        <p className="mt-1 text-sm text-text-3">
          사용자가 낸 스타·기획사·멤버 등록 건의를 검토해요. 반영은 카탈로그 관리에서 직접 추가하세요.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="상태 필터">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${FOCUS_RING} ${
              filter === f.value
                ? "border-primary bg-primary text-white"
                : "border-border text-text-2 hover:border-primary hover:text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-text-3">총 {totalElements}건</span>
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

      {loading ? (
        <p className="py-16 text-center text-sm text-text-3">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-sm text-text-3">해당 상태의 건의가 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((s) => (
            <li key={s.id} className="rounded-r3 border border-border bg-surface p-4 shadow-card">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-text-2">
                  {SUGGESTION_KIND_LABEL[s.kind]}
                </span>
                <StatusBadge tone={SUGGESTION_STATUS_TONE[s.status]}>
                  {SUGGESTION_STATUS_LABEL[s.status]}
                </StatusBadge>
                <span className="ml-auto text-[11px] text-text-3">{formatRelativeTime(s.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm font-bold text-text-1">{s.name}</p>
              {s.note && <p className="mt-0.5 text-sm text-text-2">{s.note}</p>}
              <p className="mt-1.5 text-[11px] text-text-3">제출: {s.submitterNickname ?? "-"}</p>

              {s.status === "RECEIVED" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => resolve(s.id, "ACCEPTED")}
                    className={`rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60 ${FOCUS_RING}`}
                  >
                    반영
                  </button>
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => resolve(s.id, "REJECTED")}
                    className={`rounded-full border border-border-2 bg-white px-3.5 py-1.5 text-xs font-bold text-text-2 transition-colors hover:border-accent hover:text-accent disabled:opacity-60 ${FOCUS_RING}`}
                  >
                    반려
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            className={`rounded-full border border-border-2 bg-white px-6 py-2.5 text-sm font-bold text-text-2 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
          >
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
