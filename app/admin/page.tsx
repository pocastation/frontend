"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW } from "@/lib/format";
import {
  AUCTION_STATUS_BADGE_CLASS,
  AUCTION_STATUS_LABEL,
  MEMBER_STATUS_BADGE_CLASS,
  MEMBER_STATUS_LABEL,
  PROVIDER_LABEL,
} from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminDashboardResponse, AuctionStatus } from "@/lib/types";

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-r3 border border-border bg-surface p-4 shadow-card">
      <span className={`mb-2.5 block h-2 w-6 rounded-full ${tone}`} aria-hidden="true" />
      <p className="text-xs font-bold text-text-3">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-extrabold text-text-1">{value}</p>
    </div>
  );
}

function formatDate(iso: string) {
  return iso.slice(0, 10).replace(/-/g, ".");
}

// "최근 등록 경매"는 상태를 가리지 않고 최신순으로 가져오므로 검수 대기·거절 건도 섞인다.
// 공개 상세(/auctions/{id})는 비공개 상태를 404로 막으니, 공개된 것만 상세로 보내고
// 나머지는 경매 관리 화면으로 보낸다(경매 관리 목록이 이미 쓰는 것과 같은 기준).
const PUBLIC_AUCTION_STATUSES = new Set<AuctionStatus>([
  "LIVE",
  "ENDED_SOLD",
  "ENDED_NO_BIDS",
  "CANCELLED",
]);

function recentAuctionHref(status: AuctionStatus, id: number) {
  if (PUBLIC_AUCTION_STATUSES.has(status)) return `/auctions/${id}`;
  // 검수 대기는 그 필터가 걸린 목록으로, 그 외(거절·임시저장 등)는 전체 목록으로.
  return status === "PENDING_REVIEW" ? "/admin/auctions?status=PENDING_REVIEW" : "/admin/auctions";
}

export default function AdminDashboardPage() {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchWithAuth<AdminDashboardResponse>("/api/admin/dashboard"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "대시보드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 서버 지표를 1회 로드.
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">대시보드</h1>
      <p className="mt-1.5 text-sm text-text-3">Pocastation 운영 현황을 한눈에 확인하세요.</p>

      {error && (
        <p role="alert" className="mt-5 rounded-r2 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="전체 회원 수" value={loading ? "—" : `${data?.totalMembers ?? 0}명`} tone="bg-primary-soft" />
        <StatCard label="오늘 신규 가입" value={loading ? "—" : `${data?.todaySignups ?? 0}명`} tone="bg-ok-soft" />
        <StatCard label="진행 중인 경매" value={loading ? "—" : `${data?.liveAuctions ?? 0}건`} tone="bg-surface-3" />
        <StatCard label="처리 대기 신고" value={loading ? "—" : `${data?.pendingReportCount ?? 0}건`} tone="bg-accent-soft" />
        <StatCard label="처리 대기 건의" value={loading ? "—" : `${data?.pendingSuggestionCount ?? 0}건`} tone="bg-primary-soft" />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-r3 border border-border bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-extrabold text-text-1">최근 가입 회원</h2>
            <Link href="/admin/members" className={`text-xs font-bold text-text-3 hover:text-primary ${FOCUS_RING}`}>
              전체 보기 →
            </Link>
          </div>
          {loading ? (
            <p className="py-6 text-center text-sm text-text-3">불러오는 중...</p>
          ) : !data || data.recentMembers.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-3">가입한 회원이 없습니다.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.recentMembers.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {m.nickname.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-text-1">{m.nickname}</span>
                    <span className="block truncate text-[11px] text-text-3">{PROVIDER_LABEL[m.provider] ?? m.provider}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${MEMBER_STATUS_BADGE_CLASS[m.status]}`}>
                    {MEMBER_STATUS_LABEL[m.status]}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-text-3">{formatDate(m.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-r3 border border-border bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-extrabold text-text-1">최근 등록 경매</h2>
            <Link href="/auctions" className={`text-xs font-bold text-text-3 hover:text-primary ${FOCUS_RING}`}>
              전체 보기 →
            </Link>
          </div>
          {loading ? (
            <p className="py-6 text-center text-sm text-text-3">불러오는 중...</p>
          ) : !data || data.recentAuctions.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-3">등록된 경매가 없습니다.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.recentAuctions.map((a) => (
                <li key={a.id}>
                  <Link href={recentAuctionHref(a.status, a.id)} className={`flex items-center gap-3 py-2.5 ${FOCUS_RING}`}>
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-r1 bg-surface-2">
                      {a.representativeThumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
                        <img src={mediaUrl(a.representativeThumbnailUrl)} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      {a.artistName && <span className="block truncate text-[11px] font-bold text-primary">{a.artistName}</span>}
                      <span className="block truncate text-sm font-bold text-text-1">{a.title}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-xs font-extrabold text-text-1">{formatKRW(a.currentPrice)}</span>
                      {/* 공개 전 상태는 눌러도 상세가 안 열리므로, 왜 그런지 상태로 알려준다. */}
                      {!PUBLIC_AUCTION_STATUSES.has(a.status) && (
                        <span className={`mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold ${AUCTION_STATUS_BADGE_CLASS[a.status]}`}>
                          {AUCTION_STATUS_LABEL[a.status]}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
