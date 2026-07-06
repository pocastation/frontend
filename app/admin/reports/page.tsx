"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/format";
import {
  REPORT_REASON_LABEL,
  REPORT_STATUS_BADGE_CLASS,
  REPORT_STATUS_LABEL,
  RESOLUTION_ACTION_LABEL,
} from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminReportDetailResponse, AdminReportListResponse, AdminReportSummary, ReportStatus, ResolutionAction } from "@/lib/types";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { key: ReportStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "RECEIVED", label: "접수" },
  { key: "RESOLVED", label: "처리완료" },
  { key: "REJECTED", label: "반려" },
];

function buildParams(status: ReportStatus | "ALL", page: number) {
  const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(page) });
  if (status !== "ALL") params.set("status", status);
  return params;
}

function formatDateTime(iso: string) {
  return iso.slice(0, 16).replace("T", " ");
}

export default function AdminReportsPage() {
  const { fetchWithAuth } = useAuth();

  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("ALL");
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminReportDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [action, setAction] = useState<ResolutionAction>("AUCTION_CANCELLED");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const isFirstRun = useRef(true);

  const fetchList = useCallback(
    async (status: ReportStatus | "ALL") => {
      setLoading(true);
      try {
        const res = await fetchWithAuth<AdminReportListResponse>(`/api/admin/reports?${buildParams(status, 0)}`);
        setReports(res.content);
        setPage(0);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      } catch {
        // 목록 조회 실패는 조용히 무시하고 직전 목록 유지.
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth],
  );

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      void fetchList("ALL");
      return;
    }
    void fetchList(statusFilter);
  }, [statusFilter, fetchList]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetchWithAuth<AdminReportListResponse>(`/api/admin/reports?${buildParams(statusFilter, nextPage)}`);
      setReports((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch {
      // 더보기 실패는 이미 보이는 목록 유지.
    } finally {
      setLoadingMore(false);
    }
  }

  const openDetail = useCallback(
    async (auctionId: number) => {
      setSelectedId(auctionId);
      setAction("AUCTION_CANCELLED");
      setNote("");
      setNotice(null);
      setDetailLoading(true);
      try {
        setDetail(await fetchWithAuth<AdminReportDetailResponse>(`/api/admin/reports/${auctionId}`));
      } catch (err) {
        setDetail(null);
        setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "신고 상세를 불러오지 못했습니다." });
      } finally {
        setDetailLoading(false);
      }
    },
    [fetchWithAuth],
  );

  async function confirmResolve() {
    if (!detail || submitting) return;
    if (!note.trim()) {
      setNotice({ kind: "error", text: "처리 사유를 입력해주세요." });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await fetchWithAuth<void>(`/api/admin/reports/${detail.auctionId}`, {
        method: "PATCH",
        body: { action, note: note.trim() },
      });
      setNotice({ kind: "success", text: "신고를 처리했습니다." });
      await Promise.all([openDetail(detail.auctionId), fetchList(statusFilter)]);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "처리에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  const hasMore = page + 1 < totalPages;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">신고 관리</h1>
      <p className="mt-1.5 text-sm text-text-3">접수된 신고 내역을 확인하고 필요한 조치를 취할 수 있습니다.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* 목록 */}
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="상태 필터">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={statusFilter === f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`h-10 rounded-full border px-3 text-xs font-bold transition-colors ${FOCUS_RING} ${
                  statusFilter === f.key ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:border-primary hover:text-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <p className="mb-2 text-xs text-text-3">총 {totalElements}건{loading && " · 불러오는 중..."}</p>

          <div className="overflow-x-auto rounded-r3 border border-border bg-surface shadow-card">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold text-text-3">
                  <th className="px-4 py-2.5">대상</th>
                  <th className="px-4 py-2.5">사유</th>
                  <th className="px-4 py-2.5">신고자</th>
                  <th className="px-4 py-2.5">최근 신고</th>
                  <th className="px-4 py-2.5">상태</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-3">
                      신고가 없습니다.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr
                      key={r.auctionId}
                      onClick={() => openDetail(r.auctionId)}
                      className={`cursor-pointer border-b border-border text-[13px] transition-colors last:border-0 hover:bg-surface-2 ${
                        selectedId === r.auctionId ? "bg-primary-soft/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-r1 bg-surface-2">
                            {r.representativeThumbnailUrl && (
                              // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
                              <img src={mediaUrl(r.representativeThumbnailUrl)} alt="" className="h-full w-full object-cover" />
                            )}
                          </span>
                          <span className="min-w-0">
                            {r.artistName && <span className="block truncate text-[11px] font-bold text-primary">{r.artistName}</span>}
                            <span className="block max-w-[180px] truncate font-bold text-text-1">{r.auctionTitle ?? "-"}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-extrabold text-text-2">
                          {REPORT_REASON_LABEL[r.representativeReason]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-extrabold ${r.reporterCount > 1 ? "text-accent" : "text-text-2"}`}>{r.reporterCount}명</span>
                      </td>
                      <td className="px-4 py-3 text-text-3">{formatRelativeTime(r.latestReportedAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${REPORT_STATUS_BADGE_CLASS[r.status]}`}>
                          {REPORT_STATUS_LABEL[r.status]}
                        </span>
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

        {/* 상세 패널 */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          {!selectedId ? (
            <div className="rounded-r3 border border-dashed border-border-2 p-8 text-center text-sm text-text-3">
              신고를 선택하면 상세 내용과 처리 기능이 표시됩니다.
            </div>
          ) : detailLoading || !detail ? (
            <div className="rounded-r3 border border-border bg-surface p-8 text-center text-sm text-text-3 shadow-card">
              {detailLoading ? "불러오는 중..." : "정보를 불러오지 못했습니다."}
            </div>
          ) : (
            <div className="rounded-r3 border border-border bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-base font-extrabold text-text-1">{detail.auctionTitle ?? "-"}</h2>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${REPORT_STATUS_BADGE_CLASS[detail.reports[0]?.status ?? "RECEIVED"]}`}>
                  {REPORT_STATUS_LABEL[detail.reports[0]?.status ?? "RECEIVED"]}
                </span>
              </div>

              <dl className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[12.5px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-text-3">판매자</dt>
                  <dd className="font-semibold text-text-1">{detail.sellerNickname}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-3">경매</dt>
                  <dd className="font-semibold">
                    <Link href={`/auctions/${detail.auctionId}`} className={`text-primary hover:underline ${FOCUS_RING}`}>
                      바로가기 →
                    </Link>
                  </dd>
                </div>
              </dl>

              <p className="mt-3 mb-2 border-t border-border pt-3 text-[11px] font-extrabold text-text-3">
                신고 내역 ({detail.reports.length}건)
              </p>
              <div className="flex max-h-[220px] flex-col gap-1.5 overflow-y-auto pr-1">
                {detail.reports.map((item) => (
                  <div key={item.reportId} className="rounded-r2 border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                      <span className="flex items-center gap-1.5 text-text-2">
                        {item.reporterNickname}
                        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9.5px] font-extrabold text-text-2">
                          {REPORT_REASON_LABEL[item.reasonCode]}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10.5px] font-semibold text-text-3">{formatRelativeTime(item.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-text-2">{item.detail || "-"}</p>
                  </div>
                ))}
              </div>

              {notice && (
                <p
                  role={notice.kind === "error" ? "alert" : "status"}
                  className={`mt-3 rounded-r2 px-3 py-2 text-[12px] font-semibold ${
                    notice.kind === "error" ? "bg-accent-soft text-accent" : "bg-ok-soft text-ok"
                  }`}
                >
                  {notice.text}
                </p>
              )}

              {detail.actionable ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-[11px] font-extrabold text-text-3">처리 방법 (접수 상태에서만 선택 가능)</p>
                  <div className="flex flex-col gap-1.5">
                    {(["AUCTION_CANCELLED", "NONE"] as ResolutionAction[]).map((option) => (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center gap-2 rounded-r2 border px-3 py-2 text-[13px] font-bold transition-colors ${
                          action === option ? "border-primary bg-primary-soft text-primary" : "border-border-2 text-text-2"
                        }`}
                      >
                        <input
                          type="radio"
                          name="resolutionAction"
                          value={option}
                          checked={action === option}
                          onChange={() => setAction(option)}
                          className="h-3.5 w-3.5 accent-primary"
                        />
                        {RESOLUTION_ACTION_LABEL[option]}
                      </label>
                    ))}
                  </div>

                  <label className="sr-only" htmlFor="resolve-note">처리 사유</label>
                  <textarea
                    id="resolve-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="처리 사유를 입력하세요."
                    rows={2}
                    className={`mt-2.5 w-full resize-none rounded-r2 border border-border px-3 py-2 text-[13px] outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
                  />
                  <button
                    type="button"
                    onClick={confirmResolve}
                    disabled={submitting}
                    className={`mt-2.5 h-10 w-full rounded-r2 bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60 ${FOCUS_RING}`}
                  >
                    {submitting ? "처리 중..." : "처리 확정"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4 text-[12.5px]">
                  <p className="text-[11px] font-extrabold text-text-3">처리 결과</p>
                  <div className="flex justify-between gap-2">
                    <span className="text-text-3">처리 상태</span>
                    <span className="font-semibold text-text-1">{REPORT_STATUS_LABEL[detail.reports[0]?.status ?? "RECEIVED"]}</span>
                  </div>
                  {detail.resolutionAction && (
                    <div className="flex justify-between gap-2">
                      <span className="text-text-3">처리 방법</span>
                      <span className="font-semibold text-text-1">{RESOLUTION_ACTION_LABEL[detail.resolutionAction]}</span>
                    </div>
                  )}
                  {detail.handledByNickname && (
                    <div className="flex justify-between gap-2">
                      <span className="text-text-3">처리자</span>
                      <span className="font-semibold text-text-1">{detail.handledByNickname}</span>
                    </div>
                  )}
                  {detail.handledAt && (
                    <div className="flex justify-between gap-2">
                      <span className="text-text-3">처리 일시</span>
                      <span className="font-semibold text-text-1">{formatDateTime(detail.handledAt)}</span>
                    </div>
                  )}
                  {detail.resolutionNote && (
                    <div className="flex justify-between gap-2">
                      <span className="shrink-0 text-text-3">처리 사유</span>
                      <span className="text-right font-semibold text-text-1">{detail.resolutionNote}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
