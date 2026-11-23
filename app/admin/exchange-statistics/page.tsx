"use client";

import { Fragment, useEffect, useState } from "react";
import AdminNotice from "@/components/AdminNotice";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";

const metrics = [
  { key: "registered", title: "등록된 교환거래글", column: "등록글" },
  { key: "completed", title: "거래 완료", column: "거래 완료" },
  { key: "noShows", title: "확정 노쇼", column: "확정 노쇼" },
] as const;
type Counts = Record<(typeof metrics)[number]["key"], number>;
type Session = { eventId: number; program: string; type: string; eventDate: string; counts: Counts };
type Stats = { month: string; previous: Counts; sessions: Session[] };
type Program = { key: string; name: string; counts: Counts; sessions: Session[] };

const emptyCounts = (): Counts => ({ registered: 0, completed: 0, noShows: 0 });
const format = (n: number) => n.toLocaleString("ko-KR");

function summarize(sessions: Session[]) {
  const totals = emptyCounts();
  const grouped = new Map<string, Program>();
  for (const session of sessions) {
    const key = session.type + "/" + session.program;
    const program = grouped.get(key) ?? { key, name: session.program, counts: emptyCounts(), sessions: [] };
    program.sessions.push(session);
    for (const { key: metric } of metrics) {
      program.counts[metric] += session.counts[metric];
      totals[metric] += session.counts[metric];
    }
    grouped.set(key, program);
  }
  const programs = [...grouped.values()].sort((a, b) =>
    b.counts.registered - a.counts.registered || a.name.localeCompare(b.name, "ko"));
  return { totals, programs };
}

function CountCells({ counts, maximum }: { counts: Counts; maximum?: number }) {
  return metrics.map(({ key, column }) => (
    <td key={key} data-label={column} className="px-4 py-3 tabular-nums lg:text-right">
      <span className="inline-flex items-center gap-2">
        {key === "registered" && maximum !== undefined && (
          <span aria-hidden="true" className="hidden h-1 w-12 overflow-hidden rounded-full bg-surface-2 lg:block">
            <span className="block h-full rounded-full bg-primary" style={{ width: (maximum ? counts.registered / maximum * 100 : 0) + "%" }} />
          </span>
        )}
        {format(counts[key])}건
      </span>
    </td>
  ));
}

function MonthlyStats({ month }: { month: string }) {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const controller = new AbortController();
    fetchWithAuth<Stats>("/api/admin/exchange-statistics?month=" + month, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [month, attempt, fetchWithAuth]);

  if (error) return (
    <AdminNotice kind="error" className="mt-group">
      교환 통계를 불러오지 못했습니다.{" "}
      <button type="button" className={`font-bold underline ${FOCUS_RING}`} onClick={() => { setError(false); setAttempt(attempt + 1); }}>다시 시도</button>
    </AdminNotice>
  );
  if (!data) return <p role="status" className="py-empty text-center text-body-s text-text-2">교환 통계를 불러오는 중입니다.</p>;
  const { totals, programs } = summarize(data.sessions);
  function toggle(key: string) {
    setExpanded((old) => {
      const next = new Set(old);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  return (
    <>
      <section aria-label="월간 교환 합계" className="mt-group grid grid-cols-1 divide-y divide-border rounded-card border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {metrics.map(({ key, title }) => {
          const delta = totals[key] - data.previous[key];
          return <div key={key} className="min-w-0 px-6 py-5">
            <h2 className="text-label text-text-2">{title}</h2>
            <p className="mt-1 font-display text-display font-extrabold tabular-nums text-text-1">{format(totals[key])}<span className="ml-1 text-body">건</span></p>
            <p className="mt-tight text-caption text-text-2">전월 대비 {delta > 0 ? "+" : ""}{format(delta)}건</p>
          </div>;
        })}
      </section>
      <section className="mt-section border-t border-border pt-section-ruled">
        <h2 className="text-title-s font-bold text-text-1">프로그램별 교환 현황</h2>
        <p className="mt-tight text-label text-text-2">프로그램을 선택하면 회차별 내역을 볼 수 있습니다.</p>
        {programs.length === 0 ? <p className="py-empty text-center text-body-s text-text-2">이 달에는 행사 일정이나 교환 기록이 없습니다.</p> :
          <div className="admin-table-wrap mt-head overflow-x-auto rounded-card border border-border bg-surface">
            <table className="admin-table w-full border-collapse" aria-label="프로그램별 교환 통계">
              <thead><tr className="border-b border-border text-caption font-bold text-text-2">
                <th scope="col" className="px-4 py-3 text-left">프로그램 / 행사일</th>
                {metrics.map(({key,column}) => <th scope="col" key={key} className="px-4 py-3 text-right">{column}</th>)}
              </tr></thead>
              <tbody>
                {programs.map((program) => (
                  <Fragment key={program.key}>
                    <tr className="border-b border-border text-body-s hover:bg-surface-2">
                      <td className="px-4 py-3"><button type="button" aria-expanded={expanded.has(program.key)} onClick={() => toggle(program.key)} className={`inline-flex items-center gap-2 font-bold ${FOCUS_RING}`}>
                        <span className="text-text-3" aria-hidden="true">{expanded.has(program.key) ? "⌄" : "›"}</span>{program.name}
                      </button></td>
                      <CountCells counts={program.counts} maximum={programs[0].counts.registered} />
                    </tr>
                    {expanded.has(program.key) && program.sessions.map((session) => (
                      <tr key={session.eventId} className="border-b border-border bg-surface-2 text-body-s">
                        <td className="px-8 py-3 font-bold">{session.eventDate.replaceAll("-", ". ")}</td>
                        <CountCells counts={session.counts} />
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr className="bg-surface-2 text-body-s font-bold"><td className="px-4 py-3">전체 합계</td><CountCells counts={totals} /></tr>
              </tbody>
            </table>
          </div>}
      </section>
    </>
  );
}

export default function AdminExchangeStatisticsPage() {
  const currentMonth = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date());
  const [month, setMonth] = useState(currentMonth);
  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(year, number, 0).getDate();
  return (
    <div className="pb-14 lg:px-10 lg:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-title-l font-extrabold text-text-1">교환 통계</h1>
          <p className="mt-tight text-label text-text-2">{year}년 {number}월 1일 ~ {number}월 {lastDay}일 · 한국시간 기준</p></div>
        <label className="flex items-center gap-2 text-label font-bold text-text-2">조회 월
          <input type="month" value={month} max={currentMonth} onChange={(e) => {
            if (e.target.validity.valid && /^\d{4}-\d{2}$/.test(e.target.value)) setMonth(e.target.value);
          }} className={`h-11 rounded-control border border-border-2 bg-white px-3 text-body-s text-text-1 ${FOCUS_RING}`} />
        </label>
      </div>
      <MonthlyStats key={month} month={month} />
      <section className="mt-section rounded-card bg-surface-2 px-6 py-5">
        <h2 className="text-title-s font-bold text-text-1">집계 기준</h2>
        <p className="mt-tight text-body-s text-text-2">등록글은 작성일, 거래 완료는 완료 확인일, 노쇼는 최초 확정일을 기준으로 거래마다 한 번씩 집계합니다. 보라색 막대는 등록글이 가장 많은 프로그램과 비교한 값입니다.</p>
      </section>
    </div>
  );
}
