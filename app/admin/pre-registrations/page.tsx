"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type {
  PreRegistrationApplicationListResponse,
  PreRegistrationApplicationStats,
  PreRegistrationApplicationView,
} from "@/lib/types";
import AdminNotice from "@/components/AdminNotice";

/**
 * 사전예약 현황(#608, BE #482).
 *
 * <p>창업박람회 부스에 띄워두고 보는 화면이자 사무실에서 보는 화면이다. 위쪽 집계는 멀리서도
 * 읽히게 크게 가고, 아래 목록은 가까이서 보는 용도라 평범한 표다.
 *
 * <p><b>휴대폰 번호는 기본으로 가린다.</b> 부스에서 화면을 띄워두면 지나가는 사람에게 남의 번호가
 * 그대로 보인다. 원문은 버튼을 눌렀을 때만 펼치고, 갱신되면 다시 접힌다 — 켜둔 채 자리를 뜨는
 * 것이 가장 흔한 사고다. ⚠️ 가리는 일은 <b>화면이</b> 한다. 서버는 원문을 그대로 내려주므로
 * 개발자도구에는 보인다 — 어깨너머 노출을 막는 장치이지 권한 통제가 아니다.
 *
 * <p><b>기준이 둘 섞여 있다.</b> 「전체 누적」과 「이메일까지 남김」만 전체이고 나머지는 전부
 * 오늘(KST)이다. 라벨에 「오늘」을 빼면 전체 비율로 읽히므로 화면 문구에서 지우지 말 것.
 */

// 폴링 주기. 부스에서 숫자가 늘어나는 걸 보는 화면이라 짧게 잡되, 집계 API 두 개를 부르는
// 요청이라 이보다 더 조이면 얻는 것 없이 서버만 때린다.
const REFRESH_MS = 15_000;

// 목록 한 쪽에 싣는 신청 수. 「더보기」가 이 단위로 다음 쪽을 이어 붙인다(#623).
const PAGE_SIZE = 20;

/**
 * 최신순 목록 둘을 합친다 — <b>id로 중복을 제거</b>하고 `createdAt` 내림차순으로 다시 세운다.
 *
 * <p>폴링과 누적을 함께 쓰기 때문에 필요하다. 15초마다 목록 전체를 다시 읽으면 더보기로 펼친
 * 것이 그때마다 접히므로, 폴링은 <b>첫 쪽만</b> 다시 읽고 이미 받아 둔 뒷부분은 그대로 둔다.
 *
 * <p>⚠️ 그 사이 신규 신청이 들어오면 쪽 경계가 밀려 같은 항목이 두 쪽에 걸친다. 서버는
 * offset으로 자르므로 이건 못 막는다 — 여기서 id로 흡수한다.
 */
function mergeByLatest(
  base: PreRegistrationApplicationView[],
  incoming: PreRegistrationApplicationView[],
): PreRegistrationApplicationView[] {
  const byId = new Map<number, PreRegistrationApplicationView>();
  for (const item of [...base, ...incoming]) {
    byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 010-1234-5678 → 010-****-5678. 뒷자리를 남기는 건 현장에서 신청자와 대조할 때 쓰기 때문이다. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return "***";
  return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return phone;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * 통계 한 칸. 대시보드(#294)와 같은 규칙이다 — 카드로 감싸지 않고 헤어라인으로만 나눈다.
 * 통계는 서로 비교하는 값이라 각자 껍데기에 갇힐 이유가 없다.
 */
function Stat({ label, value, detail, tone, lead }: {
  label: string;
  value: string;
  detail?: string;
  tone?: "up";
  lead?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 basis-[140px] border-l border-border px-5 first:border-l-0 first:pl-0">
      <p className="text-xs font-bold text-text-3">{label}</p>
      <p
        className={`mt-1 font-display font-extrabold tabular-nums tracking-[-0.04em] text-text-1 ${
          lead ? "text-[44px] leading-none" : "text-[30px] leading-tight"
        }`}
      >
        {value}
      </p>
      {detail && (
        <p className={`mt-1 text-[11.5px] tabular-nums ${tone === "up" ? "font-bold text-ok" : "text-text-3"}`}>
          {detail}
        </p>
      )}
    </div>
  );
}

export default function AdminPreRegistrationsPage() {
  const { fetchWithAuth } = useAuth();
  const [stats, setStats] = useState<PreRegistrationApplicationStats | null>(null);
  const [recent, setRecent] = useState<PreRegistrationApplicationView[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  /** 서버가 가진 전체 신청 수. 「더보기」를 더 보여줄지 판단하는 기준이다. */
  const [totalCount, setTotalCount] = useState(0);
  /** 다음 「더보기」가 요청할 쪽 번호. 0쪽은 폴링이 맡는다. */
  const [nextPage, setNextPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // 갱신 중에도 이전 숫자를 지우지 않는다. 15초마다 화면이 빈 상태로 깜빡이면 읽을 수가 없다
  // (검색 화면에서 같은 실수를 한 적이 있다 — FE #497).
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const [nextStats, list] = await Promise.all([
        fetchWithAuth<PreRegistrationApplicationStats>("/api/admin/pre-registrations/applications/stats"),
        fetchWithAuth<PreRegistrationApplicationListResponse>(
          `/api/admin/pre-registrations/applications?page=0&size=${PAGE_SIZE}`,
        ),
      ]);
      setStats(nextStats);
      // 첫 쪽만 다시 읽고 이미 펼쳐 둔 뒷부분과 합친다 — 폴링이 더보기를 되감으면 안 된다.
      setRecent((prev) => mergeByLatest(prev, list.content));
      setTotalCount(list.totalElements);
      setUpdatedAt(new Date().toISOString());
      setError(null);
      // 번호를 펼친 채로 두지 않는다. 갱신될 때마다 접으므로 길어야 15초 뒤에는 다시 가려진다 —
      // 켜둔 채 자리를 뜨는 것이 이 화면에서 가장 흔한 사고다.
      setRevealed(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "사전예약 현황을 불러오지 못했습니다.");
    } finally {
      loadingRef.current = false;
    }
  }, [fetchWithAuth]);

  /**
   * 다음 쪽을 이어 붙인다. 폴링(0쪽)과 달리 이쪽은 <b>사용자가 누를 때만</b> 돈다.
   *
   * <p>실패해도 이미 보고 있던 목록은 건드리지 않는다 — 더 보려다 보던 것까지 잃으면 안 된다.
   */
  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const list = await fetchWithAuth<PreRegistrationApplicationListResponse>(
        `/api/admin/pre-registrations/applications?page=${nextPage}&size=${PAGE_SIZE}`,
      );
      setRecent((prev) => mergeByLatest(prev, list.content));
      setTotalCount(list.totalElements);
      setNextPage((p) => p + 1);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "다음 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchWithAuth, loadingMore, nextPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 서버 집계를 1회 로드.
    void load();

    // 배경 탭에서는 돌리지 않는다. 부스 노트북은 하루 종일 켜져 있고, 안 보는 탭을 15초마다
    // 깨우는 건 서버에도 배터리에도 손해다. 다시 앞으로 오면 즉시 한 번 당겨 최신으로 맞춘다.
    function tick() {
      if (document.visibilityState === "visible") void load();
    }
    const timer = setInterval(tick, REFRESH_MS);

    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const peak = stats?.todayByHour?.reduce(
    (best, h) => (h.count > best.count ? h : best),
    { hour: 0, count: 0 },
  );

  /*
    막대에 그릴 시간대 범위.

    24칸을 다 그리면 새벽 빈칸이 화면 절반을 먹는다. 첫 신청이 있던 시간부터 지금까지만 그리되,
    행사 시작 직후라 칸이 두어 개뿐일 때를 대비해 최소 6칸은 확보한다.
  */
  // ⚠️ 서버가 KST로 버킷을 나눈다. 여기서 `new Date().getHours()`를 쓰면 브라우저 타임존이
  // 다른 기기에서 「지금」 표시가 엉뚱한 칸에 붙고 막대 범위도 어긋난다 — 기준을 서버에 맞춘다.
  const nowHour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "2-digit", hourCycle: "h23" })
      .format(new Date()),
  );
  const firstActive = stats?.todayByHour?.find((h) => h.count > 0)?.hour ?? nowHour;
  const endHour = Math.max(nowHour, firstActive);
  const startHour = Math.max(0, Math.min(firstActive, endHour - 5));
  const bars = stats?.todayByHour?.slice(startHour, endHour + 1) ?? [];
  const barMax = Math.max(1, ...bars.map((b) => b.count));

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-xl font-extrabold text-text-1">사전예약 현황</h1>
          <p className="mt-1 text-sm text-text-3">
            접수 중인 사전예약을 15초마다 새로 읽어요. 「오늘」은 한국시간 자정 기준이에요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-text-2">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
            {updatedAt ? `${formatRelativeTime(updatedAt)} 갱신` : "불러오는 중..."}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className={`h-8 rounded-r2 border border-border-2 px-3 text-xs font-bold text-text-2 transition-colors hover:bg-bg ${FOCUS_RING}`}
          >
            지금 새로고침
          </button>
        </div>
      </header>

      {error && (
        <AdminNotice kind="error" className="mb-4">
          {error}
        </AdminNotice>
      )}

      {!stats ? (
        <p className="py-24 text-center text-sm text-text-3">불러오는 중...</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-y-5">
            <Stat
              lead
              label="오늘 신청"
              value={stats.today.toLocaleString()}
              detail={stats.lastHour > 0 ? `최근 1시간 +${stats.lastHour}` : "최근 1시간 없음"}
              tone={stats.lastHour > 0 ? "up" : undefined}
            />
            <Stat
              label="전체 누적"
              value={stats.total.toLocaleString()}
              detail={`오늘 전 ${(stats.total - stats.today).toLocaleString()}`}
            />
            <Stat
              label="이메일까지 남김"
              value={stats.withEmail.toLocaleString()}
              detail={stats.total > 0 ? `전체의 ${((stats.withEmail / stats.total) * 100).toFixed(1)}%` : "—"}
            />
            <Stat
              label="가장 몰린 시간"
              value={peak && peak.count > 0 ? `${peak.hour}시` : "—"}
              detail={peak && peak.count > 0 ? `${peak.count}건` : "오늘 신청 없음"}
            />
          </div>

          <div className="mt-9 grid gap-9 lg:grid-cols-[1.45fr_1fr]">
            <section>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-sm font-extrabold text-text-1">오늘 시간대별 신청</h2>
                <span className="text-[11.5px] tabular-nums text-text-3">
                  {startHour}시 ~ {endHour}시 · 총 {stats.today.toLocaleString()}건
                </span>
              </div>

              <div className="mt-3 flex h-[120px] items-end gap-1.5 border-b border-border pt-1">
                {bars.map((b) => (
                  <div key={b.hour} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] font-bold tabular-nums text-text-3">{b.count || ""}</span>
                    {/* 막대는 잉크, 지금 시간대만 보라다 — 보라는 「현재」라는 상태를 말하는 자리에만 쓴다.
                        연보라 배경으로 칠하지 않는다(디자인 규칙). */}
                    <span
                      className={`w-full rounded-t-[2px] ${b.hour === nowHour ? "bg-primary" : "bg-text-1"}`}
                      style={{ height: `${Math.max(2, (b.count / barMax) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 pt-1.5">
                {bars.map((b) => (
                  <span key={b.hour} className="flex-1 text-center text-[10px] tabular-nums text-text-3">
                    {String(b.hour).padStart(2, "0")}
                  </span>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-8">
              {/* 구매자·판매자 비율 섹션을 뺐다(#611). 폼에서 이용 형태를 더 이상 받지 않아
                  오늘 들어오는 신청에는 값이 없다 — 빈 막대를 계속 그리면 「아무도 안 왔다」로 읽힌다.
                  옛 신청의 값은 DB에 남아 있으므로 나중에 필요하면 기간을 넓혀 되살릴 수 있다. */}
              <section>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-sm font-extrabold text-text-1">좋아하는 가수 상위</h2>
                  <span className="text-[11.5px] text-text-3">오늘 신청 기준</span>
                </div>
                {stats.topGroups.length === 0 ? (
                  <p className="mt-3 text-sm text-text-3">오늘 신청이 아직 없어요.</p>
                ) : (
                  <ol className="mt-3 border-t border-border">
                    {stats.topGroups.map((g, i) => (
                      <li
                        key={g.idolGroup}
                        className="grid grid-cols-[20px_1fr_auto] items-center gap-2.5 border-b border-border py-2 text-sm"
                      >
                        <span className="font-display text-[11px] font-extrabold tabular-nums text-text-3">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate text-text-1">{g.idolGroup}</span>
                        <span className="font-display font-extrabold tabular-nums text-text-1">{g.count}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </div>

          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-sm font-extrabold text-text-1">최근 신청</h2>
              <button
                type="button"
                onClick={() => setRevealed((on) => !on)}
                className={`h-8 rounded-r2 border border-border-2 px-3 text-xs font-bold text-text-2 transition-colors hover:bg-bg ${FOCUS_RING}`}
              >
                {revealed ? "번호 가리기" : "번호 원문 보기"}
              </button>
            </div>

            <p className="mt-1.5 text-xs text-text-3">
              번호는 기본으로 가려요. 화면을 띄워둔 채 자리를 비우면 지나가는 사람에게 보일 수 있어요.
            </p>

            <div className="mt-3 overflow-x-auto">
              {recent.length === 0 ? (
                <p className="py-16 text-center text-sm text-text-3">아직 신청이 없어요.</p>
              ) : (
                <table className="w-full min-w-[600px] border-collapse">
                  <thead>
                    <tr className="border-b border-border-2 text-left">
                      <th className="py-2 pr-4 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-text-3">시각</th>
                      <th className="py-2 pr-4 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-text-3">휴대폰</th>
                      <th className="py-2 pr-4 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-text-3">좋아하는 가수</th>
                      <th className="py-2 text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-text-3">이메일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((a) => (
                      <tr key={a.id} className="border-b border-border text-sm">
                        <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums text-text-3">
                          {formatRelativeTime(a.createdAt)}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[12.5px] tabular-nums text-text-1">
                          {revealed ? formatPhone(a.phone) : maskPhone(a.phone)}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-4 text-text-1">{a.idolGroup}</td>
                        <td className="whitespace-nowrap py-2.5 text-xs text-text-3">{a.email ? "남김" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {recent.length > 0 && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-[11.5px] tabular-nums text-text-3">
                  {recent.length.toLocaleString()} / {totalCount.toLocaleString()}건
                </p>
                {recent.length < totalCount && (
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className={`h-10 rounded-r2 border border-border-2 px-6 text-[13px] font-bold text-text-2 transition-colors hover:bg-bg disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    {loadingMore ? "불러오는 중..." : `${PAGE_SIZE}건 더보기`}
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
