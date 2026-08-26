"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW } from "@/lib/format";
import {
  AUCTION_STATUS_TONE,
  AUCTION_STATUS_LABEL,
  MEMBER_STATUS_TONE,
  MEMBER_STATUS_LABEL,
  PROVIDER_LABEL,
} from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminDashboardResponse, AuctionStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import AdminNotice from "@/components/AdminNotice";

/**
 * 대시보드 통계 한 칸(#294).
 *
 * <p>예전에는 다섯 개가 각각 카드였다. 통계는 <b>서로 비교하는 값</b>이라 각자 껍데기에 갇힐 이유가
 * 없고, 모바일 2열에서는 카드 패딩 탓에 숫자가 잘렸다. 헤어라인으로만 나누면 한 줄로 읽힌다.
 *
 * <p>색 스와치도 뺐다 — 다섯 개에 서로 다른 파스텔을 물려 놨는데 그 색이 아무 뜻도 없었다.
 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 basis-[128px] border-l border-border px-4 first:border-l-0 first:pl-0">
      <p className="text-xs font-bold text-text-3">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-text-1">{value}</p>
    </div>
  );
}

function formatDate(iso: string) {
  return iso.slice(0, 10).replace(/-/g, ".");
}

// "최근 등록 매물"은 상태를 가리지 않고 최신순으로 가져오므로 검수 대기·거절 건도 섞인다.
// 공개 상세(/auctions/{id})는 비공개 상태를 404로 막으니, 공개된 것만 상세로 보내고
// 나머지는 매물 관리 화면으로 보낸다(매물 관리 목록이 이미 쓰는 것과 같은 기준).
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
        <AdminNotice kind="error" className="mt-5">
          {error}
        </AdminNotice>
      )}

      {/* 위아래 규칙선 안에서 세로선으로만 나눈다 — 다섯 값이 한 덩어리로 읽혀야 비교가 된다. */}
      <div className="mt-6 flex flex-wrap gap-y-4 border-y border-border py-4">
        <Stat label="전체 회원 수" value={loading ? "—" : `${data?.totalMembers ?? 0}명`} />
        <Stat label="오늘 신규 가입" value={loading ? "—" : `${data?.todaySignups ?? 0}명`} />
        <Stat label="진행 중인 매물" value={loading ? "—" : `${data?.liveAuctions ?? 0}건`} />
        <Stat label="처리 대기 신고" value={loading ? "—" : `${data?.pendingReportCount ?? 0}건`} />
        <Stat label="처리 대기 건의" value={loading ? "—" : `${data?.pendingSuggestionCount ?? 0}건`} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-r3 border border-border bg-surface p-4">
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
                  <StatusBadge tone={MEMBER_STATUS_TONE[m.status]} className="shrink-0">
                    {MEMBER_STATUS_LABEL[m.status]}
                  </StatusBadge>
                  <span className="shrink-0 text-[11px] tabular-nums text-text-3">{formatDate(m.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-r3 border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-extrabold text-text-1">최근 등록 매물</h2>
            <Link href="/auctions" className={`text-xs font-bold text-text-3 hover:text-primary ${FOCUS_RING}`}>
              전체 보기 →
            </Link>
          </div>
          {loading ? (
            <p className="py-6 text-center text-sm text-text-3">불러오는 중...</p>
          ) : !data || data.recentAuctions.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-3">등록된 매물이 없습니다.</p>
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
                      <span className="block font-display text-xs font-extrabold text-text-1">{formatKRW(a.startPrice)}</span>
                      {/* 공개 전 상태는 눌러도 상세가 안 열리므로, 왜 그런지 상태로 알려준다. */}
                      {!PUBLIC_AUCTION_STATUSES.has(a.status) && (
                        <StatusBadge tone={AUCTION_STATUS_TONE[a.status]} className="mt-1">
                          {AUCTION_STATUS_LABEL[a.status]}
                        </StatusBadge>
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
