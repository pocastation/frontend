"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTimeKST, formatKRW } from "@/lib/format";
import {
  ADMIN_ACTION_DISPUTE,
  DISPUTE_DECISION_LABEL,
  DISPUTE_STATUS_LABEL,
  REOPENABLE_DISPUTE,
  RETURN_REASON_LABEL,
} from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminDisputeListResponse, AdminDisputeResponse, DisputeDecision } from "@/lib/types";
import AdminNotice from "@/components/AdminNotice";

const PAGE_SIZE = 30;

// 반품 처리(#213, #637 개편 · 정책 제16조). 목록은 오래된 순 — 먼저 접수된 건을 먼저 처리한다.
//
// 관리자가 실제로 손대는 단계는 둘뿐이다(접수 1차 검토 · 대금 처리). 나머지는 상대의 응답을
// 기다리는 구간이라 목록에서 도트로 갈라 보여준다 — 여섯 단계를 같은 무게로 나열하면 무엇을
// 먼저 볼지 알 수 없다.
//
// 「중재」라 부르지 않는다. 중재법 제35조에 따라 중재판정은 확정판결과 같은 효력을 갖는데
// 플랫폼의 내부 판단에는 그런 효력이 없다(design-plan §7.1-A D5).
export default function AdminDisputesPage() {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<AdminDisputeResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [includeResolved, setIncludeResolved] = useState(false);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = items.find((item) => item.orderId === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
      // 종결 건은 껐을 때 목록에서 빠진다 — 재오픈할 대상을 찾을 때만 켠다(BE #496).
      includeResolved: String(includeResolved),
    });
    try {
      const result = await fetchWithAuth<AdminDisputeListResponse>(
        "/api/admin/disputes?" + params.toString(),
      );
      const lastPage = Math.max(result.totalPages - 1, 0);
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setItems(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "분쟁 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, page, includeResolved]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 페이지·필터가 바뀌면 서버 목록을 동기화한다.
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWithAuth, page, includeResolved]);

  // 절차를 진행시키거나 대금을 가르는 행위는 전부 근거(note)를 받고 서버가 감사로그로 남긴다.
  async function post(path: string, body: Record<string, unknown>, doneMessage: string) {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    try {
      await fetchWithAuth<AdminDisputeResponse>(
        `/api/admin/disputes/${selected.orderId}/${path}`,
        { method: "POST", body },
      );
      setNotice(doneMessage);
      setSelectedId(null);
      setNote("");
      setAmount("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리 결과를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  /*
    대금 처리 3종(BE #494). 확인 문구가 결과를 그대로 말해야 한다 —
    「전액환불」은 **종결이 아니라 반송 대기로 간다**는 점이 특히 오해되기 쉽다.
  */
  async function decide(decision: DisputeDecision) {
    if (!note.trim()) return;
    const parsed = Number(amount);
    if (decision === "PARTIAL_REFUND" && (!Number.isInteger(parsed) || parsed <= 0)) {
      setError("일부 환불 금액을 원 단위 정수로 입력해 주세요.");
      return;
    }
    const confirmText =
      decision === "FULL_REFUND"
        ? "전액환불로 결정할까요?\n\n바로 환불되지 않고 구매자 반송 대기로 넘어가요. 반송이 확인되면 환불돼요."
        : decision === "PARTIAL_REFUND"
          ? `${parsed.toLocaleString()}원을 환불하고 물품은 구매자가 보유하는 것으로 종결할까요?\n\n반송 없이 끝나요.`
          : "반품 요청을 기각할까요?\n\n거래가 그대로 진행돼 자동 구매확정 경로로 돌아가요.";
    if (!window.confirm(confirmText)) return;
    await post(
      "decide",
      {
        decision,
        note: note.trim(),
        ...(decision === "PARTIAL_REFUND" ? { amount: parsed } : {}),
      },
      DISPUTE_DECISION_LABEL[decision] + "(으)로 처리했습니다.",
    );
  }

  async function requestEvidence() {
    if (!note.trim()) return;
    await post("request-evidence", { note: note.trim() }, "자료 보완을 요청했습니다.");
  }

  async function forwardToSeller() {
    if (!window.confirm("판매자에게 전달할까요?\n\n판매자의 3영업일 응답 기한이 지금부터 시작돼요."))
      return;
    await post("forward", {}, "판매자에게 전달했습니다.");
  }

  async function reopen() {
    if (!note.trim()) return;
    await post("reopen", { note: note.trim() }, "종결된 건을 다시 열었습니다.");
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-xl font-extrabold text-text-1">반품 처리</h1>
        <p className="mt-1 text-sm text-text-3">
          진행 중인 반품 건을 확인하고, 내 차례인 건에 검토·대금 처리를 진행해요.
        </p>
      </header>

      <div className="mb-4 flex items-center">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-text-2">
          <input
            type="checkbox"
            checked={includeResolved}
            onChange={(e) => {
              setIncludeResolved(e.target.checked);
              setSelectedId(null);
              setPage(0);
            }}
            className={`h-3.5 w-3.5 accent-primary ${FOCUS_RING}`}
          />
          종결 건 포함
        </label>
        <span className="ml-auto text-xs text-text-3">
          {includeResolved ? "전체" : "진행 중"} {totalElements}건
        </span>
      </div>

      {notice && (
        <AdminNotice kind="info" className="mb-3">
          {notice}
        </AdminNotice>
      )}
      {error && (
        <AdminNotice kind="error" className="mb-3">
          {error}
        </AdminNotice>
      )}

      <div className="admin-conversation min-h-[560px] overflow-hidden rounded-r3 border border-border bg-surface lg:grid lg:grid-cols-[340px_minmax(0,1fr)]">
        <section
          className={(selected ? "hidden lg:block" : "block") + " border-b border-border lg:border-b-0 lg:border-r"}
          aria-label="분쟁 목록"
        >
          {loading ? (
            <p className="py-20 text-center text-sm text-text-3">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-sm text-text-3">
              {includeResolved ? "반품 건이 없어요." : "진행 중인 반품 건이 없어요."}
            </p>
          ) : (
            <ul className="max-h-[504px] overflow-y-auto">
              {items.map((item) => {
                const active = item.orderId === selectedId;
                const needsAction = ADMIN_ACTION_DISPUTE.includes(item.disputeStatus);
                return (
                  <li key={item.orderId} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(item.orderId);
                        setNote("");
                        setNotice(null);
                      }}
                      className={
                        "w-full px-4 py-4 text-left transition-colors " +
                        FOCUS_RING +
                        (active ? " bg-primary-soft/70" : " hover:bg-surface-2")
                      }
                    >
                      <span className="flex items-center gap-2">
                        {/* 내가 손댈 단계만 도트로 강조 — 나머지는 진행 상황 참고용이다. */}
                        <span
                          className={
                            "h-1.5 w-1.5 shrink-0 rounded-full " +
                            (needsAction ? "bg-accent" : "bg-border-2")
                          }
                          aria-hidden="true"
                        />
                        <span className="text-[11px] font-extrabold text-text-2">
                          {DISPUTE_STATUS_LABEL[item.disputeStatus]}
                        </span>
                        <span className="ml-auto text-[11px] text-text-3">
                          {item.returnRequestedAt ? formatDateTimeKST(item.returnRequestedAt) : ""}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-sm font-bold text-text-1">{item.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-text-3">
                        {item.returnReason ? RETURN_REASON_LABEL[item.returnReason] : "사유 미기재"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                className={`rounded-r2 border border-border px-2.5 py-1 text-xs font-semibold text-text-2 disabled:opacity-40 ${FOCUS_RING}`}
              >
                이전
              </button>
              <span className="text-xs text-text-3">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className={`rounded-r2 border border-border px-2.5 py-1 text-xs font-semibold text-text-2 disabled:opacity-40 ${FOCUS_RING}`}
              >
                다음
              </button>
            </div>
          )}
        </section>

        <section className={(selected ? "block" : "hidden lg:block") + " p-5"} aria-label="분쟁 상세">
          {!selected ? (
            <p className="py-20 text-center text-sm text-text-3">왼쪽에서 분쟁을 선택해 주세요.</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className={`mb-3 text-xs font-semibold text-text-3 hover:text-text-1 lg:hidden ${FOCUS_RING}`}
              >
                ← 목록으로
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-text-2">
                  {DISPUTE_STATUS_LABEL[selected.disputeStatus]}
                </span>
                <Link
                  href={`/auctions/${selected.auctionId}`}
                  className={`text-xs font-semibold text-primary hover:underline ${FOCUS_RING}`}
                >
                  판매글 보기 →
                </Link>
              </div>

              <h2 className="mt-2 font-display text-lg font-extrabold text-text-1">{selected.title}</h2>

              <dl className="mt-4 divide-y divide-border rounded-r3 border border-border text-sm">
                {[
                  ["결제 금액", formatKRW(selected.chargeAmount)],
                  ["반품 사유", selected.returnReason ? RETURN_REASON_LABEL[selected.returnReason] : "-"],
                  [
                    "기한",
                    selected.disputeDueAt
                      ? formatDateTimeKST(selected.disputeDueAt)
                      : "없음 (사람이 판단하는 단계)",
                  ],
                  [
                    "반송 운송장",
                    selected.returnTrackingNumber
                      ? `${selected.returnCarrier ?? ""} ${selected.returnTrackingNumber}`
                      : "-",
                  ],
                  [
                    "요청 시각",
                    selected.returnRequestedAt ? formatDateTimeKST(selected.returnRequestedAt) : "-",
                  ],
                  ...(selected.disputeDecision
                    ? [
                        [
                          "직전 결정",
                          DISPUTE_DECISION_LABEL[selected.disputeDecision] +
                            (selected.partialRefundAmount
                              ? ` · ${formatKRW(selected.partialRefundAmount)}`
                              : ""),
                        ] as [string, string],
                      ]
                    : []),
                  ...(selected.disputeReopenCount > 0
                    ? [["재오픈", `${selected.disputeReopenCount}회`] as [string, string]]
                    : []),
                  ["구매자 ID", selected.buyerId],
                  ["판매자 ID", selected.sellerId],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3 px-3.5 py-2.5">
                    <dt className="w-24 shrink-0 text-text-3">{label}</dt>
                    <dd className="min-w-0 flex-1 break-words font-semibold text-text-1">{value}</dd>
                  </div>
                ))}
              </dl>

              {/*
                양쪽 주장을 나란히 둔다 — 판단의 재료가 이 둘이고, 위 표의 한 칸에 합치면 누가
                무엇을 말했는지 사라진다. 관리자 판단 근거(disputeNote)는 셋째 블록으로 따로 둔다.
              */}
              {(selected.returnDetail || selected.sellerDefense || selected.disputeNote) && (
                <div className="mt-4 space-y-2">
                  {selected.returnDetail && (
                    <div className="rounded-r3 bg-surface-2 px-3.5 py-2.5">
                      <span className="block text-[10.5px] font-bold uppercase tracking-wide text-text-3">
                        구매자 주장
                      </span>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-text-2">
                        {selected.returnDetail}
                      </p>
                    </div>
                  )}
                  {selected.sellerDefense && (
                    <div className="rounded-r3 bg-surface-2 px-3.5 py-2.5">
                      <span className="block text-[10.5px] font-bold uppercase tracking-wide text-text-3">
                        판매자 의견
                      </span>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-text-2">
                        {selected.sellerDefense}
                      </p>
                    </div>
                  )}
                  {selected.disputeNote && (
                    <div className="rounded-r3 border border-border px-3.5 py-2.5">
                      <span className="block text-[10.5px] font-bold uppercase tracking-wide text-text-3">
                        운영팀 기록
                      </span>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-text-2">
                        {selected.disputeNote}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 단계별로 할 수 있는 일이 다르다 — 접수는 검토 두 갈래, 대금 처리는 결정 3종,
                  종결(기각·철회)은 재오픈. 그 밖의 단계는 상대의 응답을 기다린다. */}
              {selected.disputeStatus === "RETURN_REQUESTED" ? (
                <div className="mt-5">
                  <label className="block">
                    <span className="text-xs font-bold text-text-2">보완 요청 내용</span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder="무엇이 더 필요한지 구체적으로 적어주세요. 구매자에게 그대로 전달돼요."
                      className={`mt-1.5 w-full resize-none rounded-r3 border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 ${FOCUS_RING}`}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || !note.trim()}
                      onClick={() => void requestEvidence()}
                      className={`h-10 flex-1 rounded-r2 border border-border-2 bg-surface text-sm font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      자료 보완 요청
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void forwardToSeller()}
                      className={`h-10 flex-1 rounded-r2 bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      판매자에게 전달
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-text-3">
                    각하는 없어요. 자료가 부족해도 있는 자료로 판매자 의견을 받고 판단해요.
                  </p>
                </div>
              ) : selected.disputeStatus === "ADMIN_DECISION" ? (
                <div className="mt-5">
                  <label className="block">
                    <span className="text-xs font-bold text-text-2">판정 근거 (필수)</span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder="어떤 근거로 판단했는지 적어주세요. 감사로그에 남아요."
                      className={`mt-1.5 w-full resize-none rounded-r3 border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 ${FOCUS_RING}`}
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-xs font-bold text-text-2">
                      일부 환불 금액{" "}
                      <span className="font-normal text-text-3">— 일부환불을 고를 때만</span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 9))}
                        placeholder="3000"
                        className={`h-10 w-36 rounded-r3 border border-border bg-surface px-3 text-sm tabular-nums text-text-1 placeholder:text-text-3 ${FOCUS_RING}`}
                      />
                      <span className="text-[11px] text-text-3">
                        0원 초과 · {formatKRW(selected.chargeAmount)} 미만
                      </span>
                    </span>
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || !note.trim()}
                      onClick={() => void decide("DISMISSED")}
                      className={`h-10 flex-1 rounded-r2 border border-border-2 bg-surface text-sm font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      {DISPUTE_DECISION_LABEL.DISMISSED}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !note.trim() || !amount}
                      onClick={() => void decide("PARTIAL_REFUND")}
                      className={`h-10 flex-1 rounded-r2 border border-border-2 bg-surface text-sm font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      {DISPUTE_DECISION_LABEL.PARTIAL_REFUND}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !note.trim()}
                      onClick={() => void decide("FULL_REFUND")}
                      className={`h-10 flex-1 rounded-r2 bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      {DISPUTE_DECISION_LABEL.FULL_REFUND}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-text-3">
                    전액환불은 바로 환불되지 않고 구매자 반송 대기로 넘어가요. 일부환불은 반송 없이
                    종결되고, 실지급은 PG 연동 후에 나가요.
                  </p>
                </div>
              ) : REOPENABLE_DISPUTE.includes(selected.disputeStatus) ? (
                <div className="mt-5">
                  <label className="block">
                    <span className="text-xs font-bold text-text-2">재오픈 사유 (필수)</span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder="왜 다시 열어야 하는지 적어주세요. 감사로그에 남아요."
                      className={`mt-1.5 w-full resize-none rounded-r3 border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 ${FOCUS_RING}`}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || !note.trim()}
                    onClick={() => void reopen()}
                    className={`mt-3 h-10 w-full rounded-r2 border border-border-2 bg-surface text-sm font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    다시 열어 대금 처리하기
                  </button>
                  <p className="mt-2 text-[11px] leading-relaxed text-text-3">
                    환불로 끝난 건은 되돌릴 수 없어요. 기각·철회만 다시 열 수 있어요.
                  </p>
                </div>
              ) : (
                <p className="mt-5 rounded-r3 border border-border bg-surface-2 px-3.5 py-3 text-xs leading-relaxed text-text-2">
                  상대의 응답을 기다리는 단계예요.
                  {selected.disputeDueAt
                    ? ` ${formatDateTimeKST(selected.disputeDueAt)}까지 응답이 없으면 자동으로 다음 단계로 넘어가요.`
                    : ""}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
