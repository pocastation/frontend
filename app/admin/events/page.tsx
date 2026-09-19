"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";
import type {
  AdminEventListResponse,
  EventRecurrenceListResponse,
  EventRecurrenceResponse,
  EventResponse,
  EventStatus,
  EventType,
  EventWeekday,
} from "@/lib/types";

/**
 * 행사 관리(#656). 교환 캘린더가 올라탈 일정을 사람이 관리한다.
 *
 * <p>매주 하는 일은 휴방 끄기와 공연 등록이라 행사 목록을 위에 두고, 가끔 건드리는 반복 규칙을
 * 아래에 둔다. 카탈로그 관리처럼 폼을 상단에 세 칸으로 펴지 않는 이유는, 여기서 폼을 여는 일이
 * 일상 작업이 아니기 때문이다 — 필요할 때만 펼친다.
 */

const TYPE_LABEL: Record<EventType, string> = {
  MUSIC_SHOW: "음악방송",
  CONCERT: "공연",
  ETC: "기타",
};

const WEEKDAY_LABEL: Record<EventWeekday, string> = {
  MONDAY: "월",
  TUESDAY: "화",
  WEDNESDAY: "수",
  THURSDAY: "목",
  FRIDAY: "금",
  SATURDAY: "토",
  SUNDAY: "일",
};

const WEEKDAYS: EventWeekday[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
];

const KST = "Asia/Seoul";

/** KST 기준 오늘. `new Date()`의 로컬 날짜를 쓰면 해외 접속 시 하루가 밀린다. */
function todayInKst(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: KST }));
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthRange(offset: number): { from: string; to: string } {
  const base = todayInKst();
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const last = new Date(base.getFullYear(), base.getMonth() + offset + 1, 0);
  return { from: ymd(first), to: ymd(last) };
}

/**
 * `datetime-local` 값(YYYY-MM-DDTHH:mm)을 KST로 못 박아 ISO로 바꾼다.
 *
 * <p>`new Date(value)`는 그 문자열을 **브라우저 시간대**로 읽는다. 운영자가 해외에서 접속하면
 * 몇 시간 어긋난 일정이 등록되고, 그 오차는 행사 당일까지 아무도 모른다. 오프셋을 직접 붙여
 * 기기와 무관하게 같은 값이 나가게 한다.
 */
function kstLocalToIso(value: string): string {
  return new Date(`${value}:00+09:00`).toISOString();
}

/** ISO → `datetime-local`이 받는 KST 문자열. 수정 폼의 초깃값을 채운다. */
function isoToKstLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function kstTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}

/**
 * `eventDate`는 이미 KST 날짜(YYYY-MM-DD)다. UTC 정오로 고정해 읽으면 어느 기기에서도 같은
 * 요일이 나온다 — 자정 기준으로 파싱하면 음수 오프셋 기기에서 하루가 밀린다.
 */
function dayLabel(eventDate: string): string {
  const date = new Date(`${eventDate}T12:00:00Z`);
  return ["일", "월", "화", "수", "목", "금", "토"][date.getUTCDay()];
}

const PANEL = "mt-6 rounded-r2 border border-border bg-white p-4";
const LABEL = "mb-1.5 text-[11.5px] font-bold text-text-2";
const INPUT =
  "h-9 w-full rounded-r1 border border-border-2 bg-white px-2.5 text-[13px] font-semibold text-text-1";
const BTN = `inline-flex h-9 items-center justify-center rounded-r1 bg-primary px-3.5 text-[13px] font-extrabold text-white ${FOCUS_RING}`;
const BTN_GHOST = `inline-flex h-9 items-center justify-center rounded-r1 border border-border-2 bg-white px-3.5 text-[13px] font-extrabold text-text-2 ${FOCUS_RING}`;
const LINK = `text-xs font-bold text-text-2 underline decoration-border-2 underline-offset-2 ${FOCUS_RING}`;
const LINK_D = `text-xs font-bold text-danger underline decoration-danger/30 underline-offset-2 ${FOCUS_RING}`;

type EventForm = {
  type: EventType;
  name: string;
  venue: string;
  startsAt: string;
  endsAt: string;
};

type RecurrenceForm = {
  type: EventType;
  name: string;
  venue: string;
  weekday: EventWeekday;
  startsAtTime: string;
  endsAtTime: string;
  activeFrom: string;
  activeUntil: string;
};

const EMPTY_EVENT: EventForm = { type: "CONCERT", name: "", venue: "", startsAt: "", endsAt: "" };

export default function AdminEventsPage() {
  const { fetchWithAuth } = useAuth();

  const [rangeOffset, setRangeOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState<EventType | "">("");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "">("");
  const [recurrenceFilter, setRecurrenceFilter] = useState<EventRecurrenceResponse | null>(null);

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [recurrences, setRecurrences] = useState<EventRecurrenceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [eventForm, setEventForm] = useState<EventForm | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [recurrenceForm, setRecurrenceForm] = useState<RecurrenceForm | null>(null);
  const [editingRecurrence, setEditingRecurrence] = useState<EventRecurrenceResponse | null>(null);

  const range = useMemo(() => monthRange(rangeOffset), [rangeOffset]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to, size: "200" });
      if (typeFilter) params.set("type", typeFilter);
      if (recurrenceFilter) params.set("recurrenceId", String(recurrenceFilter.id));
      const [list, rules] = await Promise.all([
        fetchWithAuth<AdminEventListResponse>(`/api/admin/events?${params}`),
        fetchWithAuth<EventRecurrenceListResponse>("/api/admin/event-recurrences"),
      ]);
      setEvents(list.content);
      setRecurrences(rules.content);
    } catch {
      setError("행사를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, range.from, range.to, typeFilter, recurrenceFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트·필터 변경 시 서버 목록을 로드.
    void load();
  }, [load]);

  // 상태는 서버가 거르지 않는다. 한 달치가 수십 건이라 화면에서 걸러도 충분하고,
  // 취소 건수를 함께 세려면 어차피 전체가 필요하다.
  const shown = statusFilter ? events.filter((e) => e.status === statusFilter) : events;
  const cancelledCount = events.filter((e) => e.status === "CANCELLED").length;

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  function openCreateEvent() {
    setEditingEventId(null);
    setEventForm(EMPTY_EVENT);
  }

  function openEditEvent(event: EventResponse) {
    setEditingEventId(event.id);
    setEventForm({
      type: event.type,
      name: event.name,
      venue: event.venue,
      startsAt: isoToKstLocal(event.startsAt),
      endsAt: isoToKstLocal(event.endsAt),
    });
  }

  async function submitEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventForm) return;
    const body = {
      name: eventForm.name,
      venue: eventForm.venue,
      startsAt: kstLocalToIso(eventForm.startsAt),
      endsAt: kstLocalToIso(eventForm.endsAt),
    };
    await run(async () => {
      if (editingEventId === null) {
        await fetchWithAuth("/api/admin/events", {
          method: "POST",
          body: { ...body, type: eventForm.type },
        });
      } else {
        await fetchWithAuth(`/api/admin/events/${editingEventId}`, { method: "PATCH", body });
      }
      setEventForm(null);
      setEditingEventId(null);
    }, editingEventId === null ? "행사를 등록했어요." : "행사를 수정했어요.");
  }

  function openCreateRecurrence() {
    setEditingRecurrence(null);
    setRecurrenceForm({
      type: "MUSIC_SHOW",
      name: "",
      venue: "",
      weekday: "SATURDAY",
      startsAtTime: "15:15",
      endsAtTime: "16:45",
      activeFrom: ymd(todayInKst()),
      activeUntil: "",
    });
  }

  function openEditRecurrence(rule: EventRecurrenceResponse) {
    setEditingRecurrence(rule);
    setRecurrenceForm({
      type: rule.type,
      name: rule.name,
      venue: rule.venue,
      weekday: rule.weekday,
      startsAtTime: rule.startsAtTime.slice(0, 5),
      endsAtTime: rule.endsAtTime.slice(0, 5),
      activeFrom: rule.activeFrom,
      activeUntil: rule.activeUntil ?? "",
    });
  }

  async function submitRecurrence(e: React.FormEvent) {
    e.preventDefault();
    if (!recurrenceForm) return;
    const shared = {
      name: recurrenceForm.name,
      venue: recurrenceForm.venue,
      startsAtTime: recurrenceForm.startsAtTime,
      endsAtTime: recurrenceForm.endsAtTime,
      activeFrom: recurrenceForm.activeFrom,
      activeUntil: recurrenceForm.activeUntil || null,
    };
    await run(async () => {
      if (editingRecurrence === null) {
        // 요일은 생성에서만 정한다. 수정에서 바꾸면 미래 회차가 옛 요일에 남고 새 요일에도 생긴다.
        await fetchWithAuth("/api/admin/event-recurrences", {
          method: "POST",
          body: { ...shared, type: recurrenceForm.type, weekday: recurrenceForm.weekday },
        });
      } else {
        await fetchWithAuth(`/api/admin/event-recurrences/${editingRecurrence.id}`, {
          method: "PATCH",
          body: shared,
        });
      }
      setRecurrenceForm(null);
      setEditingRecurrence(null);
    }, editingRecurrence === null ? "규칙을 추가했어요." : "규칙을 수정했어요.");
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">행사 관리</h1>
          <p className="mt-1 text-[12.5px] text-text-3">
            교환글이 붙는 일정이에요. 회차를 지우지 않고 취소로 꺼요.
          </p>
        </div>
        <button type="button" onClick={openCreateEvent} className={BTN}>행사 등록</button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-r1 border-l-2 border-danger bg-danger-soft px-3 py-2 text-[12.5px] font-semibold text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-r1 border-l-2 border-primary bg-surface-2 px-3 py-2 text-[12.5px] font-semibold text-text-2">
          {notice}
        </p>
      )}

      {eventForm && (
        <section className={PANEL}>
          <h2 className="font-display text-base font-extrabold text-text-1">
            {editingEventId === null ? "행사 등록" : "행사 수정"}
          </h2>
          <form onSubmit={submitEvent} className="mt-3 grid gap-3.5 lg:grid-cols-3">
            <div>
              <p className={LABEL}>유형</p>
              <select
                value={eventForm.type}
                onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as EventType })}
                disabled={editingEventId !== null}
                className={`${INPUT} disabled:bg-surface-2 disabled:text-text-3`}
              >
                {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
              {editingEventId !== null && (
                <p className="mt-1.5 text-[11px] text-text-3">유형은 바꿀 수 없어요.</p>
              )}
            </div>
            <div>
              <p className={LABEL}>이름</p>
              <input required maxLength={80} value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                placeholder="에스파 단독 콘서트" className={INPUT} />
            </div>
            <div>
              <p className={LABEL}>장소</p>
              <input required maxLength={120} value={eventForm.venue}
                onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                placeholder="KSPO DOME" className={INPUT} />
            </div>
            <div>
              <p className={LABEL}>시작</p>
              <input required type="datetime-local" value={eventForm.startsAt}
                onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })}
                className={INPUT} />
            </div>
            <div>
              <p className={LABEL}>종료 예정</p>
              <input required type="datetime-local" value={eventForm.endsAt}
                onChange={(e) => setEventForm({ ...eventForm, endsAt: e.target.value })}
                className={INPUT} />
              <p className="mt-1.5 text-[11px] text-text-3">
                교환글 마감과 사진 파기가 이 시각을 기준으로 계산돼요.
              </p>
            </div>
            <div className="flex items-end justify-end gap-2 lg:col-span-3">
              <button type="button" onClick={() => { setEventForm(null); setEditingEventId(null); }} className={BTN_GHOST}>
                취소
              </button>
              <button type="submit" disabled={busy} className={`${BTN} disabled:opacity-60`}>저장</button>
            </div>
          </form>
        </section>
      )}

      <section className={PANEL}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-r1 border border-border-2">
            {[{ v: -1, l: "지난달" }, { v: 0, l: "이번 달" }, { v: 1, l: "다음 달" }].map((o) => (
              <button key={o.v} type="button" onClick={() => setRangeOffset(o.v)}
                aria-pressed={rangeOffset === o.v}
                className={`border-l border-border-2 px-2.5 py-1.5 text-xs font-bold first:border-l-0 ${FOCUS_RING} ${
                  rangeOffset === o.v ? "bg-primary text-white" : "text-text-2"
                }`}>
                {o.l}
              </button>
            ))}
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as EventType | "")}
            aria-label="유형 필터"
            className="h-[30px] rounded-r1 border border-border-2 bg-white px-2 text-xs font-semibold text-text-2">
            <option value="">전체 유형</option>
            {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as EventStatus | "")}
            aria-label="상태 필터"
            className="h-[30px] rounded-r1 border border-border-2 bg-white px-2 text-xs font-semibold text-text-2">
            <option value="">전체 상태</option>
            <option value="SCHEDULED">예정</option>
            <option value="CANCELLED">취소</option>
          </select>
          {recurrenceFilter && (
            <button type="button" onClick={() => setRecurrenceFilter(null)}
              className={`rounded-r1 border border-primary px-2.5 py-1 text-xs font-bold text-primary ${FOCUS_RING}`}>
              {recurrenceFilter.name} 회차만 · 해제 ×
            </button>
          )}
          <p className="ml-auto text-xs font-semibold text-text-3">
            전체 <b className="font-display text-text-1">{events.length}</b>건
            {cancelledCount > 0 && <> · 취소 <b className="font-display text-text-1">{cancelledCount}</b>건</>}
          </p>
        </div>

        <table className="admin-table mt-3 w-full">
          <thead>
            <tr className="border-b border-border-2 text-left text-[11px] font-bold text-text-3">
              <th className="whitespace-nowrap px-2.5 py-2">날짜</th>
              <th className="whitespace-nowrap px-2.5 py-2">유형</th>
              <th className="px-2.5 py-2">이름 · 장소</th>
              <th className="whitespace-nowrap px-2.5 py-2">시각</th>
              <th className="whitespace-nowrap px-2.5 py-2">출처</th>
              <th className="whitespace-nowrap px-2.5 py-2">상태</th>
              <th className="px-2.5 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="py-8 text-center text-[12.5px] text-text-3">불러오는 중…</td></tr>
            )}
            {!loading && shown.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-[12.5px] text-text-3">이 기간에 등록된 행사가 없어요.</td></tr>
            )}
            {!loading && shown.map((event) => {
              const cancelled = event.status === "CANCELLED";
              return (
                <tr key={event.id} className={`border-b border-border ${cancelled ? "bg-surface-2" : ""}`}>
                  <td data-label="날짜" className="whitespace-nowrap px-2.5 py-2.5">
                    <span className="font-display text-[13.5px] font-bold">{event.eventDate.slice(5)}</span>
                    <span className="ml-1 text-[11px] font-semibold text-text-3">{dayLabel(event.eventDate)}</span>
                  </td>
                  <td data-label="유형" className="px-2.5 py-2.5">
                    <span className="inline-block rounded-r1 border border-border-2 px-1.5 py-0.5 text-[10.5px] font-extrabold text-text-2">
                      {TYPE_LABEL[event.type]}
                    </span>
                  </td>
                  <td data-label="이름" className="px-2.5 py-2.5">
                    <span className="text-[13px] font-bold tracking-[-0.01em]">{event.name}</span>
                    <span className="block text-[11px] text-text-3">{event.venue}</span>
                  </td>
                  <td data-label="시각" className="whitespace-nowrap px-2.5 py-2.5 font-display text-[12.5px] font-semibold text-text-2">
                    {kstTime(event.startsAt)}–{kstTime(event.endsAt)}
                  </td>
                  <td data-label="출처" className="px-2.5 py-2.5 text-[11.5px] text-text-3">
                    {recurrenceFilter ? recurrenceFilter.name : "—"}
                  </td>
                  <td data-label="상태" className="whitespace-nowrap px-2.5 py-2.5">
                    <span className={`text-[11.5px] font-bold ${cancelled ? "text-danger" : "text-text-2"}`}>
                      {cancelled ? "취소" : "예정"}
                    </span>
                  </td>
                  <td className="px-2.5 py-2.5">
                    <div className="flex justify-end gap-2.5">
                      <button type="button" onClick={() => openEditEvent(event)} className={LINK}>수정</button>
                      {cancelled ? (
                        <button type="button" disabled={busy}
                          onClick={() => run(() => fetchWithAuth(`/api/admin/events/${event.id}/restore`, { method: "POST" }), "취소를 되돌렸어요.")}
                          className={LINK}>되돌리기</button>
                      ) : (
                        <button type="button" disabled={busy}
                          onClick={() => run(() => fetchWithAuth(`/api/admin/events/${event.id}/cancel`, { method: "POST" }), "행사를 취소했어요.")}
                          className={LINK_D}>취소</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className={PANEL}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-extrabold text-text-1">반복 규칙</h2>
            <p className="mt-1 text-xs text-text-3">활성 규칙에서 8주 앞까지 회차를 매일 새벽 채워요.</p>
          </div>
          <button type="button" onClick={openCreateRecurrence} className={BTN_GHOST}>규칙 추가</button>
        </div>

        <table className="admin-table mt-3 w-full">
          <thead>
            <tr className="border-b border-border-2 text-left text-[11px] font-bold text-text-3">
              <th className="whitespace-nowrap px-2.5 py-2">요일</th>
              <th className="px-2.5 py-2">이름 · 장소</th>
              <th className="whitespace-nowrap px-2.5 py-2">시각</th>
              <th className="whitespace-nowrap px-2.5 py-2">활성 구간</th>
              <th className="whitespace-nowrap px-2.5 py-2">앞으로 회차</th>
              <th className="whitespace-nowrap px-2.5 py-2">상태</th>
              <th className="px-2.5 py-2" />
            </tr>
          </thead>
          <tbody>
            {!loading && recurrences.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-[12.5px] text-text-3">등록된 규칙이 없어요.</td></tr>
            )}
            {recurrences.map((rule) => (
              <tr key={rule.id} className={`border-b border-border ${rule.active ? "" : "bg-surface-2"}`}>
                <td data-label="요일" className="whitespace-nowrap px-2.5 py-2.5 font-display text-[13.5px] font-bold">
                  {WEEKDAY_LABEL[rule.weekday]}
                </td>
                <td data-label="이름" className="px-2.5 py-2.5">
                  <span className="text-[13px] font-bold tracking-[-0.01em]">{rule.name}</span>
                  <span className="block text-[11px] text-text-3">{rule.venue}</span>
                </td>
                <td data-label="시각" className="whitespace-nowrap px-2.5 py-2.5 font-display text-[12.5px] font-semibold text-text-2">
                  {rule.startsAtTime.slice(0, 5)}–{rule.endsAtTime.slice(0, 5)}
                </td>
                <td data-label="활성 구간" className="whitespace-nowrap px-2.5 py-2.5 text-[11.5px] text-text-3">
                  {rule.activeFrom} ~ {rule.activeUntil ?? "무기한"}
                </td>
                <td data-label="앞으로 회차" className="whitespace-nowrap px-2.5 py-2.5">
                  {rule.affectedFutureEvents > 0 ? (
                    <button type="button" onClick={() => { setRecurrenceFilter(rule); setRangeOffset(0); }} className={LINK}>
                      {rule.affectedFutureEvents}건
                    </button>
                  ) : (
                    <span className="text-[12px] text-text-3">0건</span>
                  )}
                </td>
                <td data-label="상태" className="whitespace-nowrap px-2.5 py-2.5">
                  <span className={`text-[11.5px] font-bold ${rule.active ? "text-text-2" : "text-danger"}`}>
                    {rule.active ? "활성" : "중단"}
                  </span>
                </td>
                <td className="px-2.5 py-2.5">
                  <div className="flex justify-end gap-2.5">
                    <button type="button" onClick={() => openEditRecurrence(rule)} className={LINK}>수정</button>
                    {rule.active && (
                      <button type="button" disabled={busy}
                        onClick={() => run(() => fetchWithAuth(`/api/admin/event-recurrences/${rule.id}/deactivate`, { method: "POST" }), "규칙을 중단했어요. 이미 만든 회차는 남아 있어요.")}
                        className={LINK_D}>중단</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {recurrenceForm && (
        <section className={PANEL}>
          <h2 className="font-display text-base font-extrabold text-text-1">
            {editingRecurrence === null ? "규칙 추가" : `규칙 수정 — ${editingRecurrence.name}`}
          </h2>

          {editingRecurrence !== null && editingRecurrence.affectedFutureEvents > 0 && (
            <div className="mt-3 rounded-r1 border-l-2 border-warn bg-warn-soft px-3 py-2.5">
              <p className="text-[12.5px] font-extrabold text-[#8a5a08]">
                고친 값은 앞으로 만들어질 회차부터 적용돼요
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[#8a5a08]/90">
                이미 만들어진 앞으로의 회차{" "}
                <button type="button" onClick={() => { setRecurrenceFilter(editingRecurrence); setRangeOffset(0); }}
                  className="font-extrabold underline underline-offset-2">
                  {editingRecurrence.affectedFutureEvents}건
                </button>
                은 옛 이름·장소·시각을 그대로 유지해요. 옮기려면 목록에서 개별로 수정해 주세요.
              </p>
            </div>
          )}

          <form onSubmit={submitRecurrence} className="mt-3 grid gap-3.5 lg:grid-cols-3">
            <div>
              <p className={LABEL}>요일</p>
              <select
                value={recurrenceForm.weekday}
                onChange={(e) => setRecurrenceForm({ ...recurrenceForm, weekday: e.target.value as EventWeekday })}
                disabled={editingRecurrence !== null}
                className={`${INPUT} disabled:bg-surface-2 disabled:text-text-3`}
              >
                {WEEKDAYS.map((d) => <option key={d} value={d}>{WEEKDAY_LABEL[d]}요일</option>)}
              </select>
              {editingRecurrence !== null && (
                <p className="mt-1.5 text-[11px] font-semibold text-warn">
                  요일은 바꿀 수 없어요. 편성이 바뀌면 이 규칙을 중단하고 새 규칙을 만들어 주세요.
                </p>
              )}
            </div>
            <div>
              <p className={LABEL}>유형</p>
              <select
                value={recurrenceForm.type}
                onChange={(e) => setRecurrenceForm({ ...recurrenceForm, type: e.target.value as EventType })}
                disabled={editingRecurrence !== null}
                className={`${INPUT} disabled:bg-surface-2 disabled:text-text-3`}
              >
                {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <p className={LABEL}>이름</p>
              <input required maxLength={80} value={recurrenceForm.name}
                onChange={(e) => setRecurrenceForm({ ...recurrenceForm, name: e.target.value })}
                placeholder="쇼! 음악중심" className={INPUT} />
            </div>
            <div>
              <p className={LABEL}>장소</p>
              <input required maxLength={120} value={recurrenceForm.venue}
                onChange={(e) => setRecurrenceForm({ ...recurrenceForm, venue: e.target.value })}
                placeholder="상암 MBC" className={INPUT} />
            </div>
            <div>
              <p className={LABEL}>시작 시각</p>
              <input required type="time" value={recurrenceForm.startsAtTime}
                onChange={(e) => setRecurrenceForm({ ...recurrenceForm, startsAtTime: e.target.value })}
                className={INPUT} />
            </div>
            <div>
              <p className={LABEL}>종료 예정</p>
              <input required type="time" value={recurrenceForm.endsAtTime}
                onChange={(e) => setRecurrenceForm({ ...recurrenceForm, endsAtTime: e.target.value })}
                className={INPUT} />
              <p className="mt-1.5 text-[11px] text-text-3">
                교환글 마감과 사진 파기가 이 시각을 기준으로 계산돼요.
              </p>
            </div>
            <div>
              <p className={LABEL}>활성 시작일</p>
              <input required type="date" value={recurrenceForm.activeFrom}
                onChange={(e) => setRecurrenceForm({ ...recurrenceForm, activeFrom: e.target.value })}
                className={INPUT} />
            </div>
            <div>
              <p className={LABEL}>활성 종료일</p>
              <input type="date" value={recurrenceForm.activeUntil}
                onChange={(e) => setRecurrenceForm({ ...recurrenceForm, activeUntil: e.target.value })}
                className={INPUT} />
              <p className="mt-1.5 text-[11px] text-text-3">비워 두면 무기한이에요.</p>
            </div>
            <div className="flex items-end justify-end gap-2 lg:col-span-3">
              <button type="button" onClick={() => { setRecurrenceForm(null); setEditingRecurrence(null); }} className={BTN_GHOST}>
                취소
              </button>
              <button type="submit" disabled={busy} className={`${BTN} disabled:opacity-60`}>저장</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
