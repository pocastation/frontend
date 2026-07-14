import type { ReactNode } from "react";

// 상태 카테고리 아이콘 — 알림함(#121)에서 만든 세트를 공용화. 알림함·마이페이지 상태 표시가 공유한다.
// tone은 소프트 색 원형 배경 + 아이콘 색(승인 시안 A). 크기는 부모 font-size(1em)로 제어한다.
export type StatusTone = "primary" | "ok" | "accent" | "warn" | "neutral";

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  primary: "bg-primary-soft text-primary",
  ok: "bg-ok-soft text-ok",
  accent: "bg-accent-soft text-accent",
  warn: "bg-warn-soft text-warn",
  neutral: "bg-surface-3 text-text-3",
};

// 24x24 stroke 아이콘(굵기 1.8, currentColor 상속).
const ICON_PATH: Record<string, ReactNode> = {
  trendingUp: (<><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></>),
  award: (<><circle cx="12" cy="9" r="6" /><path d="M9 14.5 8 22l4-2.5 4 2.5-1-7.5" /></>),
  minus: (<><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>),
  card: (<><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19" /></>),
  alertCircle: (<><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5" /><path d="M12 16h.01" /></>),
  xCircle: (<><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></>),
  tag: (<><path d="M11.5 3H4v7.5L14 20.5 21.5 13z" /><path d="M8 8h.01" /></>),
  box: (<><path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5z" /><path d="M3 8.5 12 14l9-5.5M12 14v7" /></>),
  checkCircle: (<><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>),
};

// 글리프만 렌더 — 크기는 부모의 font-size(1em), 색은 currentColor.
export function StatusGlyph({ name }: { name: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATH[name] ?? ICON_PATH.minus}
    </svg>
  );
}

// 소프트 원형 배경 + 글리프. size(원 지름)와 glyph(글리프 크기)를 지정한다.
export function StatusIconCircle({
  name,
  tone,
  size = "h-10 w-10",
  glyph = "text-[20px]",
  className = "",
}: {
  name: string;
  tone: StatusTone;
  size?: string;
  glyph?: string;
  className?: string;
}) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full ${STATUS_TONE_CLASS[tone]} ${size} ${glyph} ${className}`}>
      <StatusGlyph name={name} />
    </span>
  );
}
