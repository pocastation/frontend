"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/format";
import { AUDIT_ACTION_TONE, AUDIT_ACTION_LABEL, AUDIT_ACTION_OPTIONS, AUDIT_TARGET_TYPE_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminAuditLogListResponse, AdminAuditLogResponse, AuditAction, AuditTargetType } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import AdminNotice from "@/components/AdminNotice";

const PAGE_SIZE = 20;
const SELECT_CLASS =
  `h-10 min-w-[160px] rounded-r2 border border-border-2 bg-white px-3 text-[12.5px] font-semibold text-text-2 outline-none transition-colors focus:border-primary ${FOCUS_RING}`;

function buildParams(action: AuditAction | "ALL", targetType: AuditTargetType | "ALL", page: number) {
  const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(page) });
  if (action !== "ALL") params.set("action", action);
  if (targetType !== "ALL") params.set("targetType", targetType);
  return params;
}

export default function AdminAuditLogPage() {
  const { fetchWithAuth } = useAuth();

  const [actionFilter, setActionFilter] = useState<AuditAction | "ALL">("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState<AuditTargetType | "ALL">("ALL");
  const [logs, setLogs] = useState<AdminAuditLogResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirstRun = useRef(true);

  const fetchList = useCallback(
    async (action: AuditAction | "ALL", targetType: AuditTargetType | "ALL") => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth<AdminAuditLogListResponse>(`/api/admin/audit-logs?${buildParams(action, targetType, 0)}`);
        setLogs(res.content);
        setPage(0);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "감사 로그를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth],
  );

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      void fetchList("ALL", "ALL");
      return;
    }
    void fetchList(actionFilter, targetTypeFilter);
  }, [actionFilter, targetTypeFilter, fetchList]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetchWithAuth<AdminAuditLogListResponse>(`/api/admin/audit-logs?${buildParams(actionFilter, targetTypeFilter, nextPage)}`);
      setLogs((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch {
      // 더보기 실패는 이미 보이는 목록 유지.
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = page + 1 < totalPages;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">감사 로그</h1>
      <p className="mt-1.5 text-sm text-text-3">어드민이 수행한 중대 조치의 기록입니다. 누가·언제·무엇을·왜 했는지 확인할 수 있습니다.</p>

      {error && (
        <AdminNotice kind="error" className="mt-5">
          {error}
        </AdminNotice>
      )}

      <div className="mt-5 mb-3 flex flex-wrap gap-2.5">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as AuditAction | "ALL")}
          className={SELECT_CLASS}
          aria-label="조치 유형 필터"
        >
          <option value="ALL">조치 유형: 전체</option>
          {AUDIT_ACTION_OPTIONS.map((action) => (
            <option key={action} value={action}>
              {AUDIT_ACTION_LABEL[action]}
            </option>
          ))}
        </select>
        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value as AuditTargetType | "ALL")}
          className={SELECT_CLASS}
          aria-label="대상 유형 필터"
        >
          <option value="ALL">대상 유형: 전체</option>
          <option value="MEMBER">{AUDIT_TARGET_TYPE_LABEL.MEMBER}</option>
          <option value="AUCTION">{AUDIT_TARGET_TYPE_LABEL.AUCTION}</option>
        </select>
      </div>

      <p className="mb-2 text-xs text-text-3">총 {totalElements}건{loading && " · 불러오는 중..."}</p>

      <div className="admin-table-wrap overflow-x-auto rounded-r3 border border-border bg-surface">
        <table role="table" className="admin-table admin-table-audit w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold text-text-3">
              <th className="whitespace-nowrap px-4 py-2.5">시각</th>
              <th className="whitespace-nowrap px-4 py-2.5">관리자</th>
              <th className="whitespace-nowrap px-4 py-2.5">조치</th>
              <th className="px-4 py-2.5">대상</th>
              <th className="px-4 py-2.5">사유</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-3">
                  기록이 없습니다.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-border text-[13px] last:border-0">
                  <td data-label="시각" className="whitespace-nowrap px-4 py-3 text-text-3">{formatRelativeTime(log.createdAt)}</td>
                  <td data-label="관리자" className="whitespace-nowrap px-4 py-3 font-semibold text-text-1">{log.actorNickname ?? "—"}</td>
                  <td data-label="조치" className="whitespace-nowrap px-4 py-3">
                    <StatusBadge tone={AUDIT_ACTION_TONE[log.action]}>
                      {AUDIT_ACTION_LABEL[log.action]}
                    </StatusBadge>
                  </td>
                  <td data-label="대상" className="px-4 py-3">
                    <span className="block max-w-[200px] truncate font-semibold text-text-1">{log.targetLabel ?? "—"}</span>
                    <span className="text-[11px] text-text-3">{AUDIT_TARGET_TYPE_LABEL[log.targetType]}</span>
                  </td>
                  <td data-label="사유" className="max-w-[240px] px-4 py-3 text-text-2">
                    <span className="line-clamp-2">{log.reason ?? "—"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={`h-10 rounded-full border border-border-2 bg-white px-5 text-[13px] font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-60 ${FOCUS_RING}`}
          >
            {loadingMore ? "불러오는 중..." : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
