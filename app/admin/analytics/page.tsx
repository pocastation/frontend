"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminPageViewStats } from "@/lib/types";
import AdminNotice from "@/components/AdminNotice";

/**
 * 방문 통계(#795, BE #568).
 *
 * <p><b>두 숫자의 뜻이 다르다는 것을 화면이 말해야 한다.</b> 상단의 기간 합계는 일별 수를 더한
 * 값이라 같은 사람이 사흘 왔으면 셋으로 세고, 오늘 방문자는 그날 서로 다른 사람 수로 정확하다.
 * 라벨에서 그 구분을 지우면 두 숫자가 어긋나 보이고, 보는 사람은 어느 쪽이 맞는지 알 수 없다.
 *
 * <p><b>기간 합계를 경로별 합으로 만들지 않는다.</b> 한 사람이 세 화면을 보면 셋이 된다.
 * 유입 장부가 사람·날짜당 한 줄이므로 유입 쪽 합이 사람 수에 가깝다.
 *
 * <p>집계 배치는 하루 한 번(01:20 KST) 돈다. 서버가 오늘치는 원본에서 읽어 합쳐 주지만,
 * 「왜 오늘만 실시간인가」는 화면이 적어 두지 않으면 설명할 길이 없다.
 */
const RANGES = [7, 30, 90] as const;

type RangeDays = (typeof RANGES)[number];

/** 기간 칩. 날짜를 직접 고르는 자리는 아직 두지 않았다 — 필요해지면 그때 붙인다. */
function rangeFrom(days: RangeDays): string {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return toIsoDate(from);
}

/** `toISOString()`은 UTC로 바꿔 자정 근처에서 하루가 밀린다. 기기 날짜를 그대로 쓴다. */
function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatRange(from: string, to: string): string {
  return `${formatDay(from)} ~ ${formatDay(to)}`;
}

function formatDay(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

export default function AdminAnalyticsPage() {
  const { fetchWithAuth } = useAuth();
  const [days, setDays] = useState<RangeDays>(30);
  const [stats, setStats] = useState<AdminPageViewStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(
    async (range: RangeDays) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const data = await fetchWithAuth<AdminPageViewStats>(
          `/api/admin/page-views?from=${rangeFrom(range)}&to=${toIsoDate(new Date())}`,
        );
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "방문 통계를 불러오지 못했습니다.");
      } finally {
        loadingRef.current = false;
      }
    },
    [fetchWithAuth],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 기간이 바뀔 때마다 서버 집계를 다시 읽는다.
    void load(days);
  }, [days, load]);

  const summary = useMemo(() => {
    if (!stats) return null;
    // 기간 합계는 유입 쪽에서 낸다 — 경로별 합은 한 사람이 여러 화면을 보면 부풀려진다.
    const total = stats.sources.reduce((sum, row) => sum + row.viewers, 0);
    const today = stats.daily.at(-1)?.visitors ?? 0;
    const meta = stats.sources.find((row) => row.source === "META_ADS")?.viewers ?? 0;
    const signup = stats.paths.find((row) => row.path === "SIGNUP")?.viewers ?? 0;
    return {
      total,
      today,
      meta,
      // 유입별 합은 곧 전체 합이라 이 비율은 성립한다. 반면 가입 화면에는 비율을 붙이지
      // 않는다 — 홈을 거치지 않고 들어오는 길이 있어 분모가 상위 집합이 아니고, 실제로
      // 100%를 넘는 값이 나온다.
      metaShare: total > 0 ? Math.round((meta / total) * 100) : 0,
      signup,
    };
  }, [stats]);

  const peak = useMemo(() => {
    if (!stats || stats.daily.length === 0) return 0;
    return Math.max(...stats.daily.map((row) => row.visitors));
  }, [stats]);

  const widestSource = useMemo(() => stats?.sources[0]?.viewers ?? 0, [stats]);

  return (
    <div className="px-10 pb-14 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-title-l font-extrabold tracking-tight text-text-1">방문 통계</h1>
          <p className="mt-tight text-label text-text-2">
            {stats ? `${formatRange(stats.from, stats.to)} · ` : ""}
            오늘은 실시간, 지난 날짜는 매일 01:20에 집계합니다
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              aria-pressed={days === value}
              className={`h-9 rounded-control border px-3 text-body-s font-bold transition-colors ${FOCUS_RING} ${
                days === value
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-text-2 hover:border-border-2"
              }`}
            >
              {value}일
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <AdminNotice kind="error" className="mt-head">
          {error}
        </AdminNotice>
      ) : null}

      <div className="mt-group flex flex-wrap rounded-card border border-border">
        <SummaryCell
          label="기간 방문자 합계"
          value={summary?.total}
          note="일별 수를 더한 값 · 날짜 간 중복 포함"
        />
        <SummaryCell label="오늘 방문자" value={summary?.today} note="서로 다른 사람 수" />
        <SummaryCell
          label="메타 광고 유입"
          value={summary?.meta}
          note={summary ? `전체의 ${summary.metaShare}%` : ""}
        />
        <SummaryCell label="가입 화면 도달" value={summary?.signup} note="퍼널의 마지막 단계" />
      </div>

      <section className="mt-section border-t border-border pt-section-ruled">
        <div className="flex items-baseline justify-between">
          <h2 className="text-title-s font-bold text-text-1">일별 방문자</h2>
          <p className="text-caption text-text-2">마지막 막대가 오늘</p>
        </div>

        <div className="mt-head flex h-44 items-end gap-1" aria-hidden="true">
          {stats?.daily.map((row, index) => (
            <div key={row.date} className="flex h-full flex-1 flex-col justify-end">
              <div
                // eslint-disable-next-line no-restricted-syntax -- 차트 막대 끝 처리라 UI radius 토큰 대상이 아니다
                className={`rounded-t-[2px] ${index === stats.daily.length - 1 ? "bg-primary" : "bg-text-1"}`}
                style={{ height: peak > 0 ? `${Math.max(2, Math.round((row.visitors / peak) * 100))}%` : "0%" }}
              />
            </div>
          ))}
        </div>
        {/* 그래프는 장식이 아니라 데이터다. 스크린리더에는 같은 값을 글로 준다. */}
        <p className="sr-only">
          {stats?.daily.map((row) => `${formatDay(row.date)} ${row.visitors}명`).join(", ")}
        </p>

        {stats && stats.daily.length > 0 ? (
          <div className="mt-tight flex justify-between text-caption text-text-2">
            <span>{formatDay(stats.daily[0].date)}</span>
            <span>{formatDay(stats.daily[stats.daily.length - 1].date)} (오늘)</span>
          </div>
        ) : null}
      </section>

      <div className="mt-section flex flex-wrap gap-12 rounded-card bg-surface-2 px-8 py-7">
        <section className="min-w-0 flex-[1_1_380px]">
          <h2 className="text-title-s font-bold text-text-1">유입 경로</h2>
          <p className="mt-tight text-caption text-text-2">광고 링크의 꼬리표 기준 · 그날 처음 들어온 경로</p>
          <div className="mt-head flex flex-col gap-4">
            {stats?.sources.map((row) => (
              <div key={row.source}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body font-bold text-text-1">{row.label}</span>
                  <span className="font-display text-body-l font-bold tabular-nums text-text-1">
                    {row.viewers.toLocaleString("ko-KR")}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-border">
                  <div
                    className={`h-2 rounded-full ${row.source === "META_ADS" ? "bg-primary" : "bg-text-1"}`}
                    style={{ width: widestSource > 0 ? `${Math.round((row.viewers / widestSource) * 100)}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
            {stats && stats.sources.length === 0 ? <EmptyLine /> : null}
          </div>
        </section>

        <section className="min-w-0 flex-[1_1_380px]">
          <h2 className="text-title-s font-bold text-text-1">화면별 방문</h2>
          <p className="mt-tight text-caption text-text-2">마이페이지·주문·결제는 세지 않습니다</p>
          <table className="mt-head w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className="border-b border-border pb-2 text-left text-caption font-bold text-text-2">
                  화면
                </th>
                <th scope="col" className="border-b border-border pb-2 text-right text-caption font-bold text-text-2">
                  방문자
                </th>
              </tr>
            </thead>
            <tbody>
              {stats?.paths.map((row) => (
                <tr key={row.path}>
                  <td className="border-b border-border py-3 text-body text-text-1">{row.label}</td>
                  <td className="border-b border-border py-3 text-right font-display text-body font-bold tabular-nums text-text-1">
                    {row.viewers.toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats && stats.paths.length === 0 ? <EmptyLine /> : null}
        </section>
      </div>
    </div>
  );
}

/**
 * 네 숫자를 같은 테두리 패널 안에서 세로선으로만 가른다. 각각을 카드로 만들면 네 개가 같은
 * 무게로 반복돼 이 레포가 두 번 반려당한 모양이 된다.
 */
function SummaryCell({ label, value, note }: { label: string; value: number | undefined; note: string }) {
  return (
    <div className="min-w-[180px] flex-1 border-border px-6 py-5 [&:not(:first-child)]:border-l">
      <p className="text-label text-text-2">{label}</p>
      <p
        // eslint-disable-next-line no-restricted-syntax -- 대시보드 숫자는 스케일 밖의 큰 숫자(44px)다
        className="mt-1 font-display text-[44px] font-extrabold leading-none tracking-[-0.04em] text-text-1 tabular-nums"
      >
        {value === undefined ? "—" : value.toLocaleString("ko-KR")}
      </p>
      <p className="mt-tight text-caption text-text-2">{note}</p>
    </div>
  );
}

function EmptyLine() {
  return <p className="mt-head text-body-s text-text-2">아직 기록이 없습니다.</p>;
}
