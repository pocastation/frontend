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
 * tone → 글자색. 색은 글자에만 싣는다(#758). 채움 배경(파스텔 필)과 상태 도트는 쓰지 않는다 —
 * 필은 표 하나에 색 면이 5가지씩 떠 소음이 됐고, 도트는 방침에서 뺐다.
 */
const TEXT_CLASS: Record<StatusTone, string> = {
  ok: "text-ok",
  warn: "text-star-ink",
  danger: "text-danger",
  neutral: "text-text-2",
  // 끝났거나 비활성 — 흐려야 "지나간 것"으로 읽힌다.
  muted: "text-text-3",
};

/**
 * 상태 배지.
 *
 * <p>radius는 다른 칩·버튼과 같은 `rounded-control`이다(#758). 알약(pill)은 쓰지 않는다.
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
      className={`inline-flex items-center whitespace-nowrap rounded-control border border-border-2 bg-surface px-1.5 py-0.5 text-[11px] font-bold ${TEXT_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
