"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminDetailPane from "@/components/admin/AdminDetailPane";
import AdminNotice from "@/components/AdminNotice";
import StatusBadge from "@/components/StatusBadge";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dateTimeLabel, NO_SHOW_STATUS_TEXT } from "@/lib/exchange-labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminExchangeNoShow, AdminExchangeNoShowListResponse, ExchangeNoShowStatus } from "@/lib/types";

/**
 * 교환 노쇼 판단(#824, backend#612).
 *
 * <p>관리자가 판단하는 것은 해명이 들어와 양쪽 말이 갈린 신고(DISPUTED)뿐이다. 해명 없이 기한이 지난 신고는
 * 서버 스위퍼가 확정한다. 나머지 상태는 기록을 찾아볼 때 쓴다.
 *
 * <p>만남 확인 시각을 상세의 첫 줄에 둔다. 코드가 맞았다면 두 사람이 같은 자리에 있었다는 근거라 판단을 가장
 * 크게 가르는 값이다.
 */

const PAGE_SIZE = 20;
/** 서버 {@code ExchangeNoShowReport.MAX_TEXT_LENGTH}와 같다. */
const REASON_MAX = 500;

const STATUS_FILTERS: { key: ExchangeNoShowStatus; label: string }[] = [
  { key: "DISPUTED", label: "판단 필요" },
  { key: "PENDING", label: "해명 대기" },
  { key: "CONFIRMED", label: "노쇼 기록" },
  { key: "DISMISSED", label: "기각" },
  { key: "WITHDRAWN", label: "철회" },
];

export default function AdminExchangeNoShowsPage() {
  const { fetchWithAuth } = useAuth();

  const [status, setStatus] = useState<ExchangeNoShowStatus>("DISPUTED");
  const [items, setItems] = useState<AdminExchangeNoShow[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(
    async (s: ExchangeNoShowStatus, p: number) =>
      fetchWithAuth<AdminExchangeNoShowListResponse>(`/api/admin/exchange-no-shows?status=${s}&page=${p}&size=${PAGE_SIZE}`),
    [fetchWithAuth],
  );

  const reload = useCallback(
    async (s: ExchangeNoShowStatus) => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await load(s, 0);
        setItems(res.content);
        setPage(0);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      } catch (err) {
        setItems([]);
        setLoadError(err instanceof ApiError ? err.message : "노쇼 신고를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [load],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 상태 필터가 바뀌면 목록을 새로 받는다.
    void reload(status);
  }, [status, reload]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await load(status, page + 1);
      setItems((prev) => [...prev, ...res.content]);
      setPage(page + 1);
      setTotalPages(res.totalPages);
    } catch {
      // 더보기 실패는 보이는 목록을 유지한다.
    } finally {
      setLoadingMore(false);
    }
  }

  function select(id: number) {
    setSelectedId(id);
    setReason("");
    setNotice(null);
  }

  const selected = items.find((item) => item.id === selectedId) ?? null;

  async function resolve(decision: "CONFIRM" | "DISMISS") {
    if (!selected || submitting) return;
    if (!reason.trim()) {
      setNotice({ kind: "error", text: "판단 사유를 입력해주세요." });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await fetchWithAuth<void>(`/api/admin/exchange-no-shows/${selected.id}/resolve`, {
        method: "POST",
        body: { decision, reason: reason.trim() },
      });
      const who = selected.reportedNickname ?? "대상 회원";
      setNotice({
        kind: "success",
        text: decision === "CONFIRM" ? `${who}님의 노쇼를 기록했습니다.` : "신고를 기각했습니다.",
      });
      setReason("");
      await reload(status);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "처리에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-title-l font-extrabold text-text-1">노쇼 판단</h1>
      <p className="mt-2 text-body text-text-3">
        해명이 들어와 양쪽 말이 다른 교환 노쇼 신고를 판단합니다. 해명 없이 24시간이 지난 신고는 자동으로 기록됩니다.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className={`min-w-0 ${selectedId !== null ? "max-lg:hidden" : ""}`}>
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="상태 필터">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={status === f.key}
                onClick={() => {
                  setStatus(f.key);
                  setSelectedId(null);
                }}
                className={`h-10 rounded-control border px-3 text-label font-bold transition-colors ${FOCUS_RING} ${
                  status === f.key
                    ? "border-text-1 bg-text-1 text-white"
                    : "border-border text-text-2 hover:border-text-3 hover:text-text-1"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <p className="mb-2 text-label text-text-3">총 {totalElements}건{loading && " · 불러오는 중..."}</p>
          {loadError && (
            <AdminNotice kind="error" className="mb-3">
              {loadError}
            </AdminNotice>
          )}

          <div className="admin-table-wrap overflow-x-auto rounded-card border border-border bg-surface">
            <table role="table" className="admin-table w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-caption font-bold text-text-3">
                  <th className="px-4 py-3">신고</th>
                  <th className="px-4 py-3">장소</th>
                  <th className="whitespace-nowrap px-4 py-3">만남 확인</th>
                  <th className="whitespace-nowrap px-4 py-3">상태</th>
                  <th className="whitespace-nowrap px-4 py-3">신고 시각</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-body text-text-3">
                      {status === "DISPUTED" ? "판단할 신고가 없습니다." : "해당 상태의 신고가 없습니다."}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => select(item.id)}
                      className={`cursor-pointer border-b border-border text-body-s transition-colors last:border-0 hover:bg-surface-2 ${
                        selectedId === item.id ? "bg-surface-2" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          aria-label={`신고 ${item.id} 상세`}
                          onClick={(event) => {
                            event.stopPropagation();
                            select(item.id);
                          }}
                          className={`text-left ${FOCUS_RING}`}
                        >
                          <span className="block font-bold text-text-1">
                            {item.autoFiled
                              ? `${item.reportedNickname ?? "알 수 없음"} · 만남 미확인`
                              : `${item.reporterNickname ?? "알 수 없음"} → ${item.reportedNickname ?? "알 수 없음"}`}
                          </span>
                          <span className="font-mono text-caption text-text-3">#{item.id}</span>
                        </button>
                      </td>
                      <td data-label="장소" className="px-4 py-3 text-text-2">
                        {item.place ?? "—"}
                      </td>
                      <td data-label="만남 확인" className="whitespace-nowrap px-4 py-3">
                        {item.meetupConfirmedAt ? (
                          <span className="font-bold text-text-1">확인됨</span>
                        ) : (
                          <span className="text-text-3">없음</span>
                        )}
                      </td>
                      <td data-label="상태" className="whitespace-nowrap px-4 py-3">
                        <StatusBadge tone={NO_SHOW_STATUS_TEXT[item.status].tone}>
                          {NO_SHOW_STATUS_TEXT[item.status].label}
                        </StatusBadge>
                      </td>
                      <td data-label="신고 시각" className="whitespace-nowrap px-4 py-3 tabular-nums text-text-3">
                        {dateTimeLabel(item.reportedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {page + 1 < totalPages && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className={`h-10 rounded-control border border-border-2 bg-white px-5 text-body-s font-bold text-text-2 disabled:opacity-60 ${FOCUS_RING}`}
              >
                {loadingMore ? "불러오는 중..." : "더 보기"}
              </button>
            </div>
          )}
        </div>

        <AdminDetailPane open={selectedId !== null} title="노쇼 신고 상세" onBack={() => setSelectedId(null)}>
          {!selected ? (
            <div className="rounded-card border border-dashed border-border-2 p-8 text-center text-body text-text-3">
              {notice ? notice.text : "신고를 선택하면 양쪽 이야기와 판단 기능이 표시됩니다."}
            </div>
          ) : (
            <NoShowDetail
              item={selected}
              reason={reason}
              onReason={setReason}
              submitting={submitting}
              notice={notice}
              onResolve={resolve}
            />
          )}
        </AdminDetailPane>
      </div>
    </div>
  );
}

function NoShowDetail({
  item,
  reason,
  onReason,
  submitting,
  notice,
  onResolve,
}: {
  item: AdminExchangeNoShow;
  reason: string;
  onReason: (value: string) => void;
  submitting: boolean;
  notice: { kind: "success" | "error"; text: string } | null;
  onResolve: (decision: "CONFIRM" | "DISMISS") => void;
}) {
  const reporter = item.reporterNickname ?? "신고자";
  const reported = item.reportedNickname ?? "대상자";

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-body-l font-extrabold text-text-1">
            {item.autoFiled ? `${reported} · 만남 미확인 자동 신고` : `${reporter} → ${reported}`}
          </h2>
          <Link
            href={`/exchanges/${item.postId}`}
            target="_blank"
            className={`text-label font-semibold text-text-3 underline underline-offset-2 ${FOCUS_RING}`}
          >
            교환글 #{item.postId} · {item.place ?? "장소 없음"}
          </Link>
        </div>
        <StatusBadge tone={NO_SHOW_STATUS_TEXT[item.status].tone} className="shrink-0">
          {NO_SHOW_STATUS_TEXT[item.status].label}
        </StatusBadge>
      </div>

      {/* 판단을 가장 크게 가르는 값이라 표의 첫 줄로 올린다. */}
      <dl className="mt-3 flex flex-col gap-2 border-t border-border pt-3 text-body-s">
        <div className="flex justify-between gap-2">
          <dt className="text-text-3">만남 확인</dt>
          <dd className={`font-bold ${item.meetupConfirmedAt ? "text-text-1" : "text-text-2"}`}>
            {item.meetupConfirmedAt ? `${dateTimeLabel(item.meetupConfirmedAt)} 확인` : "코드 확인 없음"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-text-3">약속 시각</dt>
          <dd className="font-semibold text-text-1">{item.meetAt ? dateTimeLabel(item.meetAt) : "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-text-3">신고</dt>
          <dd className="font-semibold text-text-1">{dateTimeLabel(item.reportedAt)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-text-3">해명 기한</dt>
          <dd className="font-semibold text-text-1">{dateTimeLabel(item.explainUntil)}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-caption font-extrabold text-text-3">
          {reported}의 해명{item.explainedAt ? ` · ${dateTimeLabel(item.explainedAt)}` : ""}
        </p>
        <p className="mt-2 whitespace-pre-wrap break-words text-body text-text-1">
          {item.explanation ?? <span className="text-text-3">해명이 없습니다.</span>}
        </p>
      </div>

      {item.resolvedAt && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-caption font-extrabold text-text-3">처리 · {dateTimeLabel(item.resolvedAt)}</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-body-s text-text-2">
            {item.resolutionReason ?? (item.resolvedBy ? "—" : "해명 기한 경과로 자동 기록")}
          </p>
        </div>
      )}

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-3 rounded-control bg-surface-2 px-3 py-2 text-label font-semibold ${
            notice.kind === "error" ? "text-danger" : "text-text-1"
          }`}
        >
          {notice.text}
        </p>
      )}

      {item.status === "DISPUTED" && (
        <div className="mt-4 border-t border-border pt-4">
          <label htmlFor="no-show-reason" className="text-caption font-extrabold text-text-3">
            판단 사유
          </label>
          <textarea
            id="no-show-reason"
            value={reason}
            onChange={(e) => onReason(e.target.value)}
            maxLength={REASON_MAX}
            rows={3}
            placeholder="양쪽에 알림으로 가지 않고 감사 기록에만 남습니다."
            className={`mt-2 w-full resize-none rounded-control border border-border px-3 py-2 text-body-s outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onResolve("CONFIRM")}
              disabled={submitting}
              className={`h-10 flex-1 rounded-control bg-text-1 text-body font-bold text-white disabled:opacity-60 ${FOCUS_RING}`}
            >
              노쇼로 기록
            </button>
            <button
              type="button"
              onClick={() => onResolve("DISMISS")}
              disabled={submitting}
              className={`h-10 flex-1 rounded-control border border-border-2 bg-white text-body font-bold text-text-2 disabled:opacity-60 ${FOCUS_RING}`}
            >
              기각
            </button>
          </div>
          <p className="mt-2 text-label text-text-3">
            기록하면 {reported}님의 90일 노쇼 수에 더해지고, 2번째면 30일 교환 제한이 걸립니다.
          </p>
        </div>
      )}
    </div>
  );
}
