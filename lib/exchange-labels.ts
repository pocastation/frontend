import { SOURCE_LABEL } from "@/lib/labels";
import type { ExchangeItemView, ExchangeSlotView } from "@/lib/types";

/**
 * 교환글 문구 조립. 서버는 값만 내리고 사람이 읽는 문장은 화면이 만든다.
 *
 * <p>서버가 완성 문장을 내리면 같은 데이터를 목록·상세·알림이 다르게 보여줄 수 없고, 문구를
 * 고칠 때마다 배포가 필요해진다.
 */

/** 「카리나」처럼 화면에서 부르는 이름. 멤버가 없으면 그룹 이름으로 내려간다. */
export function itemName(item: ExchangeItemView | null): string {
  if (!item) return "—";
  return item.idolName ?? item.artistName ?? "알 수 없음";
}

/**
 * 「에스파 · 공개방송 · A급」. 등급은 보유 품목에만 있다.
 *
 * <p>등급을 `lib/labels`의 {@code GRADE_LABEL}로 쓰지 않는다. 그쪽은 「A급 (신품에 가까움)」처럼
 * 설명이 붙어 있어 <b>고르는 자리</b>에는 맞지만, 한 줄에 스타·출처와 함께 들어가는 이 자리에서는
 * 줄을 넘긴다. 목록에서 설명을 읽을 사람도 없다.
 */
export function itemDetail(item: ExchangeItemView | null): string {
  if (!item) return "";
  const parts = [item.artistName, SOURCE_LABEL[item.source]];
  if (item.grade) parts.push(`${item.grade}급`);
  return parts.filter(Boolean).join(" · ");
}

/**
 * 「레드벨벳 · 공개방송」. 이름을 뺀 출처 줄이다.
 *
 * <p>상세는 제목이 이미 「슬기 → 아이린」으로 이름을 말한다. 그 아래 패널까지 이름을 반복하면
 * 화면 위쪽 셋이 같은 글자를 세 번 쓴다(#718).
 */
export function itemSource(item: ExchangeItemView | null): string {
  if (!item) return "";
  return [item.artistName, SOURCE_LABEL[item.source]].filter(Boolean).join(" · ");
}

/** 자정 기준 분 → 「19:30」. */
export function minuteLabel(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** 「19:00–20:30」. */
export function slotLabel(slot: ExchangeSlotView): string {
  return `${minuteLabel(slot.fromMinuteOfDay)}–${minuteLabel(slot.toMinuteOfDay)}`;
}

/**
 * 교환글을 쓸 수 있는 구간 — 행사 시작 앞뒤 12시간(backend#541).
 *
 * <p>서버가 막는 것을 화면도 막는다. 버튼을 남겨 두면 폼을 다 채운 뒤에 400을 받는다.
 *
 * <p>상한은 서버에서 「시작 + 12시간」과 만료 중 이른 쪽인데, 만료도 12시간으로 맞춰 둘이
 * 같다 — 화면은 시작 하나만 보면 된다.
 */
/**
 * 작성 창은 행사 **날짜** 기준이다(#738). 전날 낮 12시에 열려 다음 날 낮 12시에 닫힌다.
 *
 * <p>시각이 아니라 날짜를 기준으로 두는 이유는, 시각으로 재면 같은 날 행사인데도 낮 공개방송은
 * 열려 있고 저녁 공연은 아직 닫혀 있어 「오늘 행사 글을 쓸 수 있는가」가 행사마다 갈리기 때문이다.
 *
 * <p>서버(`ExchangePost.isWritable`)와 같은 경계다. 화면이 먼저 갈라 주지 않으면 사용자는 폼을
 * 다 채운 뒤 400을 받는다.
 */
export const EXCHANGE_WRITE_OPEN_HOURS = 12;

export type ExchangeWindow = "open" | "tooEarly" | "closed";

const HOUR = 60 * 60 * 1000;

/** `YYYY-MM-DD`(KST) 기준. 브라우저 시간대와 무관하게 같은 경계를 쓴다. */
export function exchangeWindow(eventDate: string, now: number = Date.now()): ExchangeWindow {
  const dayStart = new Date(`${eventDate}T00:00:00+09:00`).getTime();
  if (now < dayStart - EXCHANGE_WRITE_OPEN_HOURS * HOUR) return "tooEarly";
  if (now > dayStart + (24 + EXCHANGE_WRITE_OPEN_HOURS) * HOUR) return "closed";
  return "open";
}

/** 서버가 10분 단위만 받는다(`ExchangeSlot.STEP_MINUTES`). */
export const SLOT_STEP_MINUTES = 10;

/**
 * 마감이 가까운가. 행사 종료 6시간 뒤가 만료라, 남은 시간이 하루 밑이면 알린다.
 *
 * <p>「임박」을 시간으로 정하는 이유는 행사 날짜만으로는 오늘 열리는 행사와 다음 주 행사가
 * 구분되지 않기 때문이다.
 */
export function isClosingSoon(expiresAt: string, now: number = Date.now()): boolean {
  const remaining = new Date(expiresAt).getTime() - now;
  return remaining > 0 && remaining < 24 * 60 * 60 * 1000;
}

/**
 * 마감이 지났는가.
 *
 * <p><b>판정을 {@code status}가 아니라 시각으로 한다.</b> 만료 스위퍼는 한 시간에 한 번 도므로
 * 그 사이 글은 {@code OPEN}인 채로 마감 시각을 넘긴다. 서버는 신청 시점에 다시 검사해 막지만,
 * 화면이 {@code status}만 보면 사용자는 사진까지 올린 뒤에 거절당한다.
 */
export function isClosed(expiresAt: string, now: number = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}
