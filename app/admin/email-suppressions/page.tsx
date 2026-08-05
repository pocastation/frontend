"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";
import type {
  AdminEmailSuppression,
  AdminEmailSuppressionListResponse,
} from "@/lib/types";

// 사유는 세 가지뿐이고 각각 의미가 다르다 — 해제 판단이 사유에 달려 있어 그대로 보여준다.
const REASON_LABEL: Record<AdminEmailSuppression["reason"], string> = {
  HARD_BOUNCE: "하드 바운스",
  COMPLAINT: "스팸 신고",
  MANUAL: "수동 등록",
};

const REASON_NOTE: Record<AdminEmailSuppression["reason"], string> = {
  HARD_BOUNCE: "존재하지 않는 주소로 판정됐어요. 오타라면 본인이 다시 가입하는 편이 안전해요.",
  COMPLAINT: "수신자가 스팸으로 신고했어요. 본인 확인 없이 풀면 같은 신고가 반복될 수 있어요.",
  MANUAL: "운영자가 직접 등록했어요.",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminEmailSuppressionsPage() {
  const { fetchWithAuth } = useAuth();
  const [rows, setRows] = useState<AdminEmailSuppression[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<AdminEmailSuppression | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 해제 후 재조회는 이 값을 올려서 트리거한다 — effect 안에서 직접 setState를 부르면
  // 연쇄 렌더가 되므로(react-hooks/set-state-in-effect) 응답 콜백에서만 상태를 쓴다.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchWithAuth<AdminEmailSuppressionListResponse>("/api/admin/email-suppressions?size=100")
      .then((res) => {
        if (!alive) return;
        setRows(res.content);
        setTotal(res.totalElements);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [fetchWithAuth, reloadKey]);

  async function release() {
    if (!target || submitting) return;
    if (!reason.trim()) {
      setModalError("해제 사유를 입력해야 합니다.");
      return;
    }
    setSubmitting(true);
    setModalError(null);
    try {
      await fetchWithAuth<void>("/api/admin/email-suppressions", {
        method: "DELETE",
        body: { email: target.email, reason: reason.trim() },
      });
      setToast(`${target.email} 해제 완료`);
      setTarget(null);
      setReason("");
      setLoading(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "해제에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">발송 금지 목록</h1>
      <p className="mt-1.5 max-w-[46rem] text-sm leading-relaxed text-text-3">
        하드 바운스·스팸 신고가 확인된 주소예요. 이 목록에 있으면 인증 메일도 비밀번호 재설정 메일도
        나가지 않아, 그 계정으로 들어갈 방법이 사라집니다.
      </p>

      {/* 해제의 무게를 화면에서도 드러낸다 — 이건 "다시 보내겠다"는 결정이고,
          근거 없이 반복하면 발신 도메인 평판 관리가 무력해진다. */}
      <p className="mt-4 border-l-[3px] border-accent pl-4 text-[13px] leading-relaxed text-text-2">
        <b className="font-extrabold text-text-1">해제는 본인 확인 후에만 하세요.</b> 신고당한 주소로
        계속 보내면 발신 도메인 평판이 깎여 <b className="font-bold text-text-1">다른 회원의 메일까지
        스팸함으로</b> 갑니다.
      </p>

      <div className="mt-7 flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] text-text-3">
          {loading ? "불러오는 중..." : `총 ${total.toLocaleString()}건`}
        </p>
        {toast && (
          <p aria-live="polite" className="text-[12.5px] font-bold text-ok">
            {toast}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[13px] font-bold text-danger">
          {error}
        </p>
      )}

      {!loading && rows.length === 0 && !error && (
        <p className="mt-6 border-y border-border py-10 text-center text-[13px] text-text-3">
          발송이 막힌 주소가 없어요.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="mt-3 border-t border-text-1/20">
          {rows.map((row) => (
            <li key={row.id} className="border-b border-border py-4 sm:flex sm:items-start sm:gap-6">
              <div className="min-w-0 sm:flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-[13.5px] font-extrabold break-all text-text-1">{row.email}</span>
                  <span className="text-[11.5px] font-bold text-text-3">
                    {REASON_LABEL[row.reason]}
                    {row.detail && ` · ${row.detail}`}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-text-3">
                  {REASON_NOTE[row.reason]}
                </p>
                <p className="mt-1 text-[11.5px] tabular-nums text-text-3">
                  {formatDate(row.suppressedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTarget(row);
                  setReason("");
                  setModalError(null);
                }}
                className={`mt-3 h-10 shrink-0 rounded-[4px] border border-border-2 bg-white px-4 text-[13px] font-bold text-text-1 transition-colors hover:border-primary hover:text-primary sm:mt-0 ${FOCUS_RING}`}
              >
                해제
              </button>
            </li>
          ))}
        </ul>
      )}

      {target && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-[6px] bg-surface p-5 shadow-modal">
            <h2 className="font-display text-base font-extrabold text-text-1">발송 금지 해제</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-3">
              <b className="font-bold break-all text-text-1">{target.email}</b> 로 다시 메일을 보낼 수
              있게 됩니다. {REASON_LABEL[target.reason]}으로 등록된 주소예요.
            </p>
            <label className="sr-only" htmlFor="release-reason">
              해제 사유
            </label>
            <textarea
              id="release-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예) 회원 문의로 본인 확인 완료, 오타 정정"
              rows={3}
              autoFocus
              maxLength={200}
              className={`mt-3 w-full resize-none rounded-[4px] border border-border px-3 py-2 text-[13px] outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
            />
            {modalError && (
              <p role="alert" className="mt-2 text-[12px] font-bold text-danger">
                {modalError}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTarget(null)}
                disabled={submitting}
                className={`h-10 flex-1 rounded-[4px] border border-border-2 bg-white text-sm font-bold text-text-2 transition-colors hover:border-primary disabled:opacity-60 ${FOCUS_RING}`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={release}
                disabled={submitting}
                className={`h-10 flex-1 rounded-[4px] bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60 ${FOCUS_RING}`}
              >
                {submitting ? "해제 중..." : "해제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
