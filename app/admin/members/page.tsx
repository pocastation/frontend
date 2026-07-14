"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MEMBER_ROLE_LABEL, MEMBER_STATUS_BADGE_CLASS, MEMBER_STATUS_LABEL, PROVIDER_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type {
  AdminMemberDetailResponse,
  AdminMemberListResponse,
  AdminMemberSummary,
  MemberRole,
  MemberStatus,
  MemberStatusAction,
} from "@/lib/types";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

const STATUS_FILTERS: { key: MemberStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "ACTIVE", label: "활동" },
  { key: "SUSPENDED", label: "정지" },
  { key: "WITHDRAWN", label: "탈퇴" },
];

function buildParams(q: string, status: MemberStatus | "ALL", page: number) {
  const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(page) });
  if (q.trim()) params.set("q", q.trim());
  if (status !== "ALL") params.set("status", status);
  return params;
}

function formatDate(iso: string) {
  return iso.slice(0, 10).replace(/-/g, ".");
}

export default function AdminMembersPage() {
  const { fetchWithAuth, member: me } = useAuth();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "ALL">("ALL");
  const [members, setMembers] = useState<AdminMemberSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminMemberDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [roleTarget, setRoleTarget] = useState<MemberRole | null>(null);
  const [roleReason, setRoleReason] = useState("");
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleToast, setRoleToast] = useState<string | null>(null);

  const isFirstRun = useRef(true);

  const fetchList = useCallback(
    async (q: string, status: MemberStatus | "ALL") => {
      setLoading(true);
      try {
        const res = await fetchWithAuth<AdminMemberListResponse>(`/api/admin/members?${buildParams(q, status, 0)}`);
        setMembers(res.content);
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
      void fetchList("", "ALL");
      return;
    }
    const timer = setTimeout(() => void fetchList(query, statusFilter), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, statusFilter, fetchList]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetchWithAuth<AdminMemberListResponse>(
        `/api/admin/members?${buildParams(query, statusFilter, nextPage)}`,
      );
      setMembers((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch {
      // 더보기 실패는 이미 보이는 목록 유지.
    } finally {
      setLoadingMore(false);
    }
  }

  const openDetail = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setReason("");
      setNotice(null);
      setRoleTarget(null);
      setRoleReason("");
      setRoleError(null);
      setDetailLoading(true);
      try {
        setDetail(await fetchWithAuth<AdminMemberDetailResponse>(`/api/admin/members/${id}`));
      } catch (err) {
        setDetail(null);
        setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "회원 상세를 불러오지 못했습니다." });
      } finally {
        setDetailLoading(false);
      }
    },
    [fetchWithAuth],
  );

  async function changeStatus(action: MemberStatusAction) {
    if (!detail || submitting) return;
    if (action === "SUSPEND" && !reason.trim()) {
      setNotice({ kind: "error", text: "정지 사유를 입력해주세요." });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await fetchWithAuth<void>(`/api/admin/members/${detail.id}/status`, {
        method: "PATCH",
        body: { action, reason: action === "SUSPEND" ? reason.trim() : undefined },
      });
      const labels: Record<MemberStatusAction, string> = {
        SUSPEND: "정지",
        UNSUSPEND: "정지 해제",
        WITHDRAW: "탈퇴 처리",
      };
      setNotice({ kind: "success", text: `${detail.nickname} 회원을 ${labels[action]}했습니다.` });
      setReason("");
      await Promise.all([openDetail(detail.id), fetchList(query, statusFilter)]);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof ApiError ? err.message : "상태 변경에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmRoleChange() {
    if (!detail || !roleTarget || roleSubmitting) return;
    if (!roleReason.trim()) {
      setRoleError("사유를 입력해주세요.");
      return;
    }
    setRoleSubmitting(true);
    setRoleError(null);
    try {
      await fetchWithAuth<void>(`/api/admin/members/${detail.id}/role`, {
        method: "PATCH",
        body: { role: roleTarget, reason: roleReason.trim() },
      });
      const verb = roleTarget === "ADMIN" ? "관리자로 승격" : "관리자 권한을 회수";
      setRoleToast(`${detail.nickname}님을 ${verb}했습니다. 대상이 다시 로그인해야 반영됩니다.`);
      setTimeout(() => setRoleToast(null), 4000);
      setRoleTarget(null);
      setRoleReason("");
      await Promise.all([openDetail(detail.id), fetchList(query, statusFilter)]);
    } catch (err) {
      setRoleError(err instanceof ApiError ? err.message : "역할 변경에 실패했습니다.");
    } finally {
      setRoleSubmitting(false);
    }
  }

  const hasMore = page + 1 < totalPages;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">회원 관리</h1>
      <p className="mt-1.5 text-sm text-text-3">회원 정보를 검색하고 계정 상태를 관리합니다.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* 목록 — min-w-0로 그리드 컬럼이 테이블(min-w) 너비만큼 늘어나 페이지가 넘치는 걸 막고,
            테이블은 내부(overflow-x-auto)에서만 가로 스크롤되게 한다. */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-full border border-border px-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-3" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <span className="sr-only">닉네임 또는 이메일 검색</span>
              <input
                type="search"
                placeholder="닉네임 또는 이메일 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border-0 bg-transparent text-[13.5px] text-text-1 outline-none placeholder:text-text-3"
              />
            </label>
            <div className="flex gap-1.5" role="group" aria-label="상태 필터">
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
          </div>

          <p className="mb-2 text-xs text-text-3">총 {totalElements}명{loading && " · 불러오는 중..."}</p>

          <div className="overflow-x-auto rounded-r3 border border-border bg-surface shadow-card">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold text-text-3">
                  <th className="px-4 py-2.5">닉네임</th>
                  <th className="px-4 py-2.5">이메일 / 가입</th>
                  <th className="whitespace-nowrap px-4 py-2.5">상태</th>
                  <th className="whitespace-nowrap px-4 py-2.5">역할</th>
                  <th className="whitespace-nowrap px-4 py-2.5">가입일</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-3">
                      {query ? "검색 결과가 없습니다." : "회원이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => openDetail(m.id)}
                      className={`cursor-pointer border-b border-border text-[13px] transition-colors last:border-0 hover:bg-surface-2 ${
                        selectedId === m.id ? "bg-primary-soft/50" : ""
                      } ${m.status === "SUSPENDED" ? "bg-accent-soft/40" : ""}`}
                    >
                      <td className="px-4 py-3 font-bold text-text-1">
                        <span className="block">{m.nickname}</span>
                        {/* 변하지 않는 짧은 식별자(UUID 앞 8자리) — 닉 변경·동명이인과 무관하게 특정용. */}
                        <span className="font-mono text-[11px] font-normal text-text-3">#{m.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-4 py-3 text-text-2">
                        <span className="block truncate">{m.email ?? "—"}</span>
                        <span className="text-[11px] text-text-3">{PROVIDER_LABEL[m.provider] ?? m.provider}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${MEMBER_STATUS_BADGE_CLASS[m.status]}`}>
                          {MEMBER_STATUS_LABEL[m.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-text-2">{m.role === "ADMIN" ? "관리자" : "일반"}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-text-3">{formatDate(m.createdAt)}</td>
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
              회원을 선택하면 상세 정보와 관리 기능이 표시됩니다.
            </div>
          ) : detailLoading || !detail ? (
            <div className="rounded-r3 border border-border bg-surface p-8 text-center text-sm text-text-3 shadow-card">
              {detailLoading ? "불러오는 중..." : "정보를 불러오지 못했습니다."}
            </div>
          ) : (
            <div className="rounded-r3 border border-border bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-base font-extrabold text-text-1">{detail.nickname}</h2>
                  {/* 변하지 않는 짧은 식별자(UUID 앞 8자리). 전체 UUID는 조치 API 경로에 그대로 쓰인다. */}
                  <span className="font-mono text-[11px] text-text-3">#{detail.id.slice(0, 8)}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${MEMBER_STATUS_BADGE_CLASS[detail.status]}`}>
                  {MEMBER_STATUS_LABEL[detail.status]}
                </span>
              </div>

              <dl className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[12.5px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-text-3">이메일</dt>
                  <dd className="truncate font-semibold text-text-1">{detail.email ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-3">가입 방식</dt>
                  <dd className="font-semibold text-text-1">{PROVIDER_LABEL[detail.provider] ?? detail.provider}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-3">역할</dt>
                  <dd className="font-semibold text-text-1">{detail.role === "ADMIN" ? "관리자" : "일반"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-3">가입일</dt>
                  <dd className="font-semibold text-text-1">{formatDate(detail.createdAt)}</dd>
                </div>
              </dl>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                <div className="rounded-r2 bg-surface-2 px-3 py-2 text-center">
                  <p className="text-[11px] text-text-3">판매</p>
                  <p className="font-display text-sm font-extrabold text-text-1">{detail.sellingCount}건</p>
                </div>
                <div className="rounded-r2 bg-surface-2 px-3 py-2 text-center">
                  <p className="text-[11px] text-text-3">입찰</p>
                  <p className="font-display text-sm font-extrabold text-text-1">{detail.biddingCount}건</p>
                </div>
              </div>

              {detail.status === "SUSPENDED" && detail.suspensionReason && (
                <p className="mt-3 rounded-r2 bg-accent-soft px-3 py-2 text-[12px] text-accent">
                  정지 사유: {detail.suspensionReason}
                </p>
              )}

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

              {detail.status !== "WITHDRAWN" ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-[11px] font-extrabold text-text-3">상태 변경</p>
                  {detail.status === "ACTIVE" ? (
                    <>
                      <label className="sr-only" htmlFor="suspend-reason">정지 사유</label>
                      <textarea
                        id="suspend-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="정지 사유를 입력하세요."
                        rows={2}
                        className={`w-full resize-none rounded-r2 border border-border px-3 py-2 text-[13px] outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => changeStatus("SUSPEND")}
                          disabled={submitting}
                          className={`h-10 flex-1 rounded-r2 bg-accent text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS_RING}`}
                        >
                          정지 처리
                        </button>
                        <button
                          type="button"
                          onClick={() => changeStatus("WITHDRAW")}
                          disabled={submitting}
                          className={`h-10 rounded-r2 border border-border-2 bg-white px-4 text-sm font-bold text-text-2 transition-colors hover:border-primary disabled:opacity-60 ${FOCUS_RING}`}
                        >
                          탈퇴
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => changeStatus("UNSUSPEND")}
                        disabled={submitting}
                        className={`h-10 flex-1 rounded-r2 bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60 ${FOCUS_RING}`}
                      >
                        정지 해제
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus("WITHDRAW")}
                        disabled={submitting}
                        className={`h-10 rounded-r2 border border-border-2 bg-white px-4 text-sm font-bold text-text-2 transition-colors hover:border-primary disabled:opacity-60 ${FOCUS_RING}`}
                      >
                        탈퇴
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 border-t border-border pt-4 text-center text-[12px] text-text-3">
                  탈퇴 처리된 계정입니다.
                </p>
              )}

              {/* 권한 — 본인 계정은 변경 금지(락아웃 방지), 정지된 회원은 승격 불가(백엔드 제약과 정합). */}
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-extrabold text-text-3">권한</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${detail.role === "ADMIN" ? "bg-primary-soft text-primary" : "bg-surface-2 text-text-2"}`}>
                    {MEMBER_ROLE_LABEL[detail.role as MemberRole]}
                  </span>
                </div>
                {me?.id === detail.id ? (
                  <p className="rounded-r2 bg-surface-2 px-3 py-2 text-center text-[11.5px] leading-relaxed text-text-3">
                    본인 계정의 역할은 변경할 수 없어요
                  </p>
                ) : detail.role === "ADMIN" ? (
                  <button
                    type="button"
                    onClick={() => { setRoleTarget("USER"); setRoleReason(""); setRoleError(null); }}
                    className={`h-10 w-full rounded-r2 border border-[#fbdca8] bg-[#fff7ed] text-sm font-bold text-[#b45309] transition-opacity hover:opacity-90 ${FOCUS_RING}`}
                  >
                    관리자 권한 회수
                  </button>
                ) : detail.status === "ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => { setRoleTarget("ADMIN"); setRoleReason(""); setRoleError(null); }}
                    className={`h-10 w-full rounded-r2 bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
                  >
                    관리자로 승격
                  </button>
                ) : (
                  <p className="rounded-r2 bg-surface-2 px-3 py-2 text-center text-[11.5px] leading-relaxed text-text-3">
                    활동 상태인 회원만 승격할 수 있어요
                  </p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {roleTarget && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-r3 bg-surface p-5 shadow-modal">
            <h2 className="font-display text-base font-extrabold text-text-1">
              {roleTarget === "ADMIN" ? "관리자로 승격" : "관리자 권한 회수"}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-3">
              {roleTarget === "ADMIN"
                ? <>&quot;{detail.nickname}&quot;님을 관리자로 승격합니다. 회원 정지·경매 취소·신고 처리 권한이 부여됩니다.</>
                : <>&quot;{detail.nickname}&quot;님의 관리자 권한을 회수합니다. 더 이상 관리 기능을 사용할 수 없습니다.</>}
            </p>
            <label className="sr-only" htmlFor="role-reason">사유</label>
            <textarea
              id="role-reason"
              value={roleReason}
              onChange={(e) => setRoleReason(e.target.value)}
              placeholder={roleTarget === "ADMIN" ? "승격 사유를 입력하세요." : "회수 사유를 입력하세요."}
              rows={3}
              autoFocus
              className={`mt-3 w-full resize-none rounded-r2 border border-border px-3 py-2 text-[13px] outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
            />
            {roleError && (
              <p role="alert" className="mt-2 rounded-r2 bg-accent-soft px-3 py-2 text-[12px] font-semibold text-accent">
                {roleError}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setRoleTarget(null)}
                disabled={roleSubmitting}
                className={`h-10 flex-1 rounded-r2 border border-border-2 bg-white text-sm font-bold text-text-2 transition-colors hover:border-primary disabled:opacity-60 ${FOCUS_RING}`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmRoleChange}
                disabled={roleSubmitting}
                className={`h-10 flex-1 rounded-r2 bg-primary text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS_RING}`}
              >
                {roleSubmitting ? "처리 중..." : roleTarget === "ADMIN" ? "승격 확정" : "회수 확정"}
              </button>
            </div>
          </div>
        </div>
      )}

      {roleToast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex max-w-sm -translate-x-1/2 items-start gap-2.5 rounded-r3 border border-[#bfe8d2] bg-ok-soft px-4 py-3 shadow-modal">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok text-[11px] font-bold text-white">✓</span>
          <p className="text-[12.5px] font-semibold leading-relaxed text-ok">{roleToast}</p>
        </div>
      )}
    </div>
  );
}
