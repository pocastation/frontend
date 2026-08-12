"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTimeKST, formatKRW } from "@/lib/format";
import { DISPUTE_STATUS_LABEL, RETURN_REASON_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminDisputeListResponse, AdminDisputeResponse } from "@/lib/types";
import AdminNotice from "@/components/AdminNotice";

const PAGE_SIZE = 30;

// 반품·분쟁 중재(#213, 약관 제25조). 목록은 오래된 순 — 먼저 접수된 건을 먼저 처리한다.
// 중재 결정(환불/기각)은 UNDER_MEDIATION인 건에만 가능하며, 그 외 단계는 진행 상황 파악용이다.
export default function AdminDisputesPage() {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<AdminDisputeResponse[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState("");
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
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
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
  }, [fetchWithAuth, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 페이지가 바뀌면 서버 목록을 동기화한다.
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWithAuth, page]);

  // 중재 결정은 돈의 향방을 정하는 행위라 근거(note)를 필수로 받고, 서버에서 감사로그로 남는다.
  async function resolve(refund: boolean) {
    if (!selected || !note.trim()) return;
    if (!window.confirm(refund ? "구매자에게 환불 처리할까요?" : "반품 요청을 기각할까요?")) return;
    setBusy(true);
    setNotice(null);
    try {
      await fetchWithAuth<AdminDisputeResponse>("/api/admin/disputes/" + selected.orderId + "/resolve", {
        method: "POST",
        body: { refund, note: note.trim() },
      });
      setNotice(refund ? "환불로 종결했습니다." : "반품 요청을 기각했습니다.");
      setSelectedId(null);
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "중재 결과를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-xl font-extrabold text-text-1">분쟁·중재</h1>
        <p className="mt-1 text-sm text-text-3">
          진행 중인 반품 건을 확인하고, 중재 대기 건에 환불 또는 기각을 결정해요.
        </p>
      </header>

      <div className="mb-4 flex items-center">
        <span className="ml-auto text-xs text-text-3">진행 중 {totalElements}건</span>
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

      <div className="min-h-[560px] overflow-hidden rounded-r3 border border-border bg-surface lg:grid lg:grid-cols-[340px_minmax(0,1fr)]">
        <section
          className={(selected ? "hidden lg:block" : "block") + " border-b border-border lg:border-b-0 lg:border-r"}
          aria-label="분쟁 목록"
        >
          {loading ? (
            <p className="py-20 text-center text-sm text-text-3">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-sm text-text-3">진행 중인 분쟁이 없어요.</p>
          ) : (
            <ul className="max-h-[504px] overflow-y-auto">
              {items.map((item) => {
                const active = item.orderId === selectedId;
                const needsAction = item.disputeStatus === "UNDER_MEDIATION";
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
                        {/* 중재 대기만 도트로 강조 — 나머지는 진행 상황 참고용이다. */}
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
                  경매 보기 →
                </Link>
              </div>

              <h2 className="mt-2 font-display text-lg font-extrabold text-text-1">{selected.title}</h2>

              <dl className="mt-4 divide-y divide-border rounded-r3 border border-border text-sm">
                {[
                  ["결제 금액", formatKRW(selected.chargeAmount)],
                  ["반품 사유", selected.returnReason ? RETURN_REASON_LABEL[selected.returnReason] : "-"],
                  ["구매자 설명", selected.returnDetail ?? "-"],
                  ["판매자 의견", selected.disputeNote ?? "-"],
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
                  ["구매자 ID", selected.buyerId],
                  ["판매자 ID", selected.sellerId],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3 px-3.5 py-2.5">
                    <dt className="w-24 shrink-0 text-text-3">{label}</dt>
                    <dd className="min-w-0 flex-1 break-words font-semibold text-text-1">{value}</dd>
                  </div>
                ))}
              </dl>

              {selected.disputeStatus === "UNDER_MEDIATION" ? (
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
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy || !note.trim()}
                      onClick={() => void resolve(false)}
                      className={`h-10 flex-1 rounded-r2 border border-border-2 bg-surface text-sm font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      기각 (거래 진행)
                    </button>
                    <button
                      type="button"
                      disabled={busy || !note.trim()}
                      onClick={() => void resolve(true)}
                      className={`h-10 flex-1 rounded-r2 bg-text-1 text-sm font-bold text-white transition-colors hover:bg-text-2 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      환불 처리
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-5 rounded-r3 border border-border bg-surface-2 px-3.5 py-3 text-xs leading-relaxed text-text-2">
                  아직 당사자 간 절차가 진행 중이라 중재 결정을 내릴 수 없어요.
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
