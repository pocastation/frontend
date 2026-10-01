import type { ReactNode } from "react";

/**
 * 상태 배지의 의미 축(#289). 색 클래스가 아니라 **뜻**을 담는다 — 호출부와 라벨 맵은
 * "무슨 색인가"가 아니라 "무슨 뜻인가"만 말하고, 그 뜻을 어떻게 그릴지는 이 파일이 정한다.
 */
export type StatusTone = "ok" | "warn" | "danger" | "neutral" | "muted";

/**
 * tone → 글자 모양. 상태는 상자 없이 **글자**로 말한다(#767).
 *
 * <p>표·목록의 상태는 토스·당근처럼 글자만 둔다. 완료·진행은 잉크 굵게, 손댈 것(danger)만 빨강,
 * 대기는 회색, 끝난 것은 흐린 회색. 색을 하나(빨강)만 남겨야 손댈 줄이 먼저 보인다.
 */
const TEXT_CLASS: Record<StatusTone, string> = {
  ok: "font-bold text-text-1",
  warn: "font-semibold text-text-2",
  danger: "font-bold text-danger",
  neutral: "font-semibold text-text-2",
  muted: "font-semibold text-text-3",
};

export default function StatusBadge({
  tone,
  children,
  className = "",
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={`inline-flex whitespace-nowrap text-label ${TEXT_CLASS[tone]} ${className}`}>{children}</span>;
}
