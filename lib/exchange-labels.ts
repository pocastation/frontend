import { SOURCE_LABEL } from "@/lib/labels";
import type { ExchangeItemView, ExchangePhase, ExchangeSlotView } from "@/lib/types";

/**
 * 교환글 문구 조립. 서버는 값만 내리고 사람이 읽는 문장은 화면이 만든다.
 *
 * <p>서버가 완성 문장을 내리면 같은 데이터를 목록·상세·알림이 다르게 보여줄 수 없고, 문구를
 * 고칠 때마다 배포가 필요해진다.
 */

const PHASE_LABEL: Record<ExchangePhase, string> = {
  BEFORE_ENTRY: "입장 전",
  WAITING: "대기 중",
  AFTER_END: "종료 후",
};

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

/** 「종료 후 19–20시」. 분 단위는 받지 않으므로 시각만 쓴다. */
export function slotLabel(slot: ExchangeSlotView): string {
  return `${PHASE_LABEL[slot.phase]} ${slot.fromHour}–${slot.toHour}시`;
}

export const PHASE_OPTIONS: { value: ExchangePhase; label: string }[] = [
  { value: "BEFORE_ENTRY", label: "입장 전" },
  { value: "WAITING", label: "대기 중" },
  { value: "AFTER_END", label: "종료 후" },
];

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
