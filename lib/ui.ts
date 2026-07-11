// 폼 전반이 공유하는 스타일 상수 — 포커스 링·인풋 외곽선을 한 곳에서 통일해서
// 페이지마다 따로 손보다 일관성이 깨지는 걸 방지한다.
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export const INPUT_CLASS =
  `w-full rounded-r2 border border-border px-3.5 py-2.5 text-sm text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`;

export const PRIMARY_BUTTON_CLASS =
  `rounded-full bg-primary text-sm font-bold text-white transition-all hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${FOCUS_RING}`;

export const SECONDARY_BUTTON_CLASS =
  `rounded-full border border-border-2 bg-white text-sm font-bold text-text-2 transition-all hover:border-primary hover:text-primary active:scale-[0.98] ${FOCUS_RING}`;

// 상세 페이지 상단 액션(공유·찜·신고)이 공유하는 아이콘 버튼 — 라벨 없이 아웃라인 아이콘만,
// 색 없는(gray) 통일 스타일. 찜의 활성(빨간 하트)만 예외로 자기 상태를 색으로 표시한다.
export const ACTION_ICON_BUTTON =
  `flex h-9 w-9 items-center justify-center rounded-r2 text-text-3 transition-colors hover:text-text-1 ${FOCUS_RING}`;
