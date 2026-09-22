/**
 * 행사 날짜 계산. 전부 KST 고정이다.
 *
 * <p>행사는 「9월 20일에 있다」가 사용자에게 의미 있는 단위인데, 브라우저 시간대로 날짜를 뽑으면
 * 자정 근처에서 하루가 밀린다. 서버가 `eventDate`를 KST 날짜 문자열로 내려주는 것도 같은 이유고,
 * 화면이 그걸 다시 `new Date()`로 풀면 그 보호가 사라진다.
 */

export const KST = "Asia/Seoul";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** KST 기준 오늘을 로컬 자정 Date로. 달력 격자 계산에만 쓴다(시각 없음). */
export function todayInKst(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ymd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * `YYYY-MM-DD`의 요일. UTC 정오로 고정해 읽으면 어느 기기에서도 같은 값이 나온다 —
 * 자정 기준으로 파싱하면 음수 오프셋 기기에서 하루가 밀린다.
 */
export function weekdayKo(eventDate: string): string {
  return WEEKDAY_KO[new Date(`${eventDate}T12:00:00Z`).getUTCDay()];
}

/**
 * 이 날짜가 속한 주의 일요일. 홈 스트립이 2주를 세우는 기준점이다(#726).
 *
 * <p>오늘부터 세면 요일이 세로로 맞지 않는다 — 22일(화)에서 시작하면 첫 칸이 화요일이라
 * 「이번 주」가 읽히지 않는다. 주 시작으로 맞추면 27일(일)에 다음 두 주로 통째로 넘어간다.
 */
export function weekStart(date: Date): Date {
  return addDays(date, -date.getDay());
}

export function weekdayIndex(eventDate: string): number {
  return new Date(`${eventDate}T12:00:00Z`).getUTCDay();
}

/** ISO 시각을 KST 「15:15」로. */
export function kstHm(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** `YYYY-MM` → 그 달의 1일과 말일. */
export function monthBounds(month: string): { first: Date; last: Date } {
  const [y, m] = month.split("-").map(Number);
  return { first: new Date(y, m - 1, 1), last: new Date(y, m, 0) };
}

/**
 * 달력 격자가 실제로 덮는 범위 — 앞 달 말일 몇 칸과 다음 달 초 몇 칸을 포함한다.
 *
 * <p>조회는 이 범위로 해야 한다. {@link monthBounds}로 부르면 격자에 깔리는 앞뒤 칸이 데이터
 * 없는 상태로 남아 <b>행사가 있는데 없는 것처럼 보인다.</b>
 */
export function gridBounds(month: string): { first: Date; last: Date } {
  const days = calendarDays(month);
  return { first: days[0], last: days[days.length - 1] };
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}년 ${m}월`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const next = new Date(y, m - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonth(): string {
  const today = todayInKst();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 달력 격자에 깔 날짜들. 1일이 속한 주의 일요일부터 말일이 속한 주의 토요일까지.
 * 주 수가 달마다 달라 고정 6주로 채우지 않는다 — 빈 줄이 생기면 아래 목록이 멀어진다.
 */
export function calendarDays(month: string): Date[] {
  const { first, last } = monthBounds(month);
  const start = addDays(first, -first.getDay());
  const end = addDays(last, 6 - last.getDay());
  const days: Date[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor));
  }
  return days;
}
