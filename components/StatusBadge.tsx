import type { ReactNode } from "react";

/**
 * 상태 배지의 의미 축(#289). 색 클래스가 아니라 **뜻**을 담는다 — 호출부와 라벨 맵은
 * "무슨 색인가"가 아니라 "무슨 뜻인가"만 말하고, 그 뜻을 어떻게 그릴지는 이 파일이 정한다.
 *
 * <p>그래서 배지 생김새를 바꿀 때 고칠 곳이 여기 하나다. 예전에는 색만 `lib/labels.ts`에 있고
 * 모양(radius·padding·크기)은 <b>호출부 13곳이 각자 적어</b>, 같은 배지가 곳곳에서 조금씩 다르게
 * 생겼고 한 번에 바꿀 방법이 없었다.
 */
export type StatusTone = "ok" | "warn" | "danger" | "neutral" | "muted";

/**
 * tone → 도트 색. <b>글자는 tone과 무관하게 언제나 같은 잉크</b>이고 색은 이 5px 점에만 있다.
 *
 * <p>색을 없애는 게 아니라 <b>면적을 줄이는</b> 것이다. 예전 파스텔 필은 배지 전체가 색이라
 * 표 하나에 색이 5가지씩 떴다 — 색이 정보를 주는 게 아니라 소음이 됐다. 점 하나로 줄이면
 * 스캔 능력은 유지되고 지면은 조용해진다.
 */
const DOT_CLASS: Record<StatusTone, string> = {
  ok: "bg-ok",
  warn: "bg-[var(--color-star-line)]",
  danger: "bg-accent",
  neutral: "bg-text-3",
  // 끝났거나 비활성 — 점이 거의 보이지 않아야 "지나간 것"으로 읽힌다.
  muted: "bg-border-2",
};

/**
 * 상태 배지.
 *
 * <p>알약(pill)이 아니라 <b>4px radius 칩</b>이다 — 알약은 「필터·태그처럼 누를 수 있는 것」에
 * 쓰고, 상태는 누를 수 없는 표시라 형태를 구분한다(홈 리뉴얼에서 확정한 radius 매핑).
 */
export default function StatusBadge({
  tone,
  children,
  className = "",
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] border border-border-2 bg-surface px-1.5 py-0.5 text-[11px] font-bold text-text-2 ${className}`}
    >
      <span aria-hidden="true" className={`h-[5px] w-[5px] shrink-0 rounded-full ${DOT_CLASS[tone]}`} />
      {children}
    </span>
  );
}
