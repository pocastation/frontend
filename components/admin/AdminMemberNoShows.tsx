"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dateTimeLabel, NO_SHOW_STATUS_TEXT } from "@/lib/exchange-labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminMemberNoShowHistory } from "@/lib/types";

/**
 * 회원 상세의 교환 노쇼 이력(#824, backend#612).
 *
 * <p>제한 판단과 같은 값(최근 90일 노쇼 수)을 첫 줄에 두고, 진행 중인 제한이 있으면 해제를 그 아래에 붙인다.
 * 신고 이력은 철회·기각까지 전부 보여 준다. 기각이 쌓인 회원은 신고를 당하기 쉬운 쪽이라는 뜻이라 판단에 쓰인다.
 */
export default function AdminMemberNoShows({ memberId }: { memberId: string }) {
  const { fetchWithAuth } = useAuth();
  const [history, setHistory] = useState<AdminMemberNoShowHistory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lifting, setLifting] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setHistory(await fetchWithAuth<AdminMemberNoShowHistory>(`/api/admin/members/${memberId}/exchange-no-shows`));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "노쇼 이력을 불러오지 못했습니다.");
    }
  }, [fetchWithAuth, memberId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 회원이 바뀌면 이력을 새로 받는다.
    void load();
  }, [load]);

  async function lift() {
    if (lifting === null || submitting) return;
    if (!reason.trim()) {
      setNotice({ kind: "error", text: "해제 사유를 입력해주세요." });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await fetchWithAuth<void>(`/api/admin/exchange-restrictions/${lifting}/lift`, {
        method: "POST",
        body: { reason: reason.trim() },
      });
      setLifting(null);
      setReason("");
      setNotice({ kind: "success", text: "교환 제한을 해제했습니다." });
      await load();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "제한 해제에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  const active = history?.restrictions.find((r) => r.active) ?? null;
  const past = history?.restrictions.filter((r) => !r.active) ?? [];

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-caption font-extrabold text-text-3">교환 노쇼</p>
        {history && (
          <span className="text-label text-text-2">
            최근 {history.windowDays}일{" "}
            <b className={`font-display font-extrabold ${history.noShowCount > 0 ? "text-text-1" : "text-text-3"}`}>
              {history.noShowCount}회
            </b>
          </span>
        )}
      </div>

      {loadError ? (
        <p className="text-label text-danger">{loadError}</p>
      ) : !history ? (
        <p className="text-label text-text-3">불러오는 중...</p>
      ) : (
        <>
          {active ? (
            <div className="rounded-control bg-surface-2 px-3 py-3">
              <p className="text-body-s font-bold text-danger">교환 제한 중</p>
              <p className="mt-1 text-label text-text-2">
                {dateTimeLabel(active.startsAt)} ~ {dateTimeLabel(active.endsAt)}
              </p>
              {lifting === active.id ? (
                <>
                  <label className="sr-only" htmlFor="lift-reason">
                    해제 사유
                  </label>
                  <textarea
                    id="lift-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                    rows={2}
                    autoFocus
                    placeholder="해제 사유를 입력하세요."
                    className={`mt-2 w-full resize-none rounded-control border border-border bg-white px-3 py-2 text-body-s outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLifting(null);
                        setNotice(null);
                      }}
                      disabled={submitting}
                      className={`h-10 flex-1 rounded-control border border-border-2 bg-white text-body-s font-bold text-text-2 disabled:opacity-60 ${FOCUS_RING}`}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={lift}
                      disabled={submitting}
                      className={`h-10 flex-1 rounded-control bg-primary text-body-s font-bold text-white disabled:opacity-60 ${FOCUS_RING}`}
                    >
                      {submitting ? "해제 중..." : "해제 확정"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setLifting(active.id);
                    setReason("");
                    setNotice(null);
                  }}
                  className={`mt-2 h-10 w-full rounded-control border border-border-2 bg-white text-body-s font-bold text-text-1 ${FOCUS_RING}`}
                >
                  제한 해제
                </button>
              )}
            </div>
          ) : (
            <p className="text-label text-text-3">진행 중인 교환 제한이 없습니다.</p>
          )}

          {notice && (
            <p role={notice.kind === "error" ? "alert" : "status"} className={`mt-2 text-label font-semibold ${notice.kind === "error" ? "text-danger" : "text-text-1"}`}>
              {notice.text}
            </p>
          )}

          {past.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-label text-text-3">
              {past.map((r) => (
                <li key={r.id}>
                  지난 제한 {dateTimeLabel(r.startsAt)} ~ {dateTimeLabel(r.endsAt)}
                  {r.liftedAt && ` · ${dateTimeLabel(r.liftedAt)} 해제${r.liftReason ? `(${r.liftReason})` : ""}`}
                </li>
              ))}
            </ul>
          )}

          {history.reports.length > 0 && (
            <ul className="mt-3 divide-y divide-border border-t border-border">
              {history.reports.map((report) => (
                <li key={report.id} className="flex items-baseline justify-between gap-2 py-2 text-label">
                  <span className="min-w-0">
                    <span className="block truncate text-text-1">
                      {report.place ?? "장소 없음"} · {report.reporterNickname ?? "알 수 없음"}님 신고
                    </span>
                    <span className="tabular-nums text-text-3">{dateTimeLabel(report.reportedAt)}</span>
                  </span>
                  {report.status === "DISPUTED" ? (
                    <Link href="/admin/exchange-no-shows" className={`shrink-0 font-bold text-danger underline underline-offset-2 ${FOCUS_RING}`}>
                      판단 필요
                    </Link>
                  ) : (
                    <StatusBadge tone={NO_SHOW_STATUS_TEXT[report.status].tone} className="shrink-0">
                      {NO_SHOW_STATUS_TEXT[report.status].label}
                    </StatusBadge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
