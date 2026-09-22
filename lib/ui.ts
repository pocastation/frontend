// 폼 전반이 공유하는 스타일 상수 — 포커스 링·인풋 외곽선을 한 곳에서 통일해서
// 페이지마다 따로 손보다 일관성이 깨지는 걸 방지한다.
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

/*
  모바일 눌린 상태(#720).

  터치에는 hover가 오지 않는다. 그래서 눌린 느낌은 `active:`로 따로 말해야 하는데, 저장소에
  hover는 354곳이고 active는 8곳이었다 — 하단 탭·교환 CTA·피드 행은 둘 다 0이었다.

  규칙 다섯(시안 승인본):
  1. 전환은 75ms. 길면 뗀 뒤에도 남아 늦게 느껴진다
  2. 바탕이 있으면 배경으로, 흰 바탕이면 opacity로 말한다
  3. scale은 독립한 것에만 — 버튼·칩·카드. 목록 행과 탭에 쓰면 옆 것과 어긋나 보인다
  4. 선택 결과(보라)와 눌림(회색)을 섞지 않는다
  5. 비활성에는 눌림을 주지 않는다 — 반응하면 눌린 줄 안다
*/
const PRESS_BASE = "transition-[background-color,opacity,transform] duration-75";

/** 보라 CTA. 배경을 한 단 어둡게. */
export const PRESS_PRIMARY = `${PRESS_BASE} active:bg-primary-dark active:scale-[0.98]`;
/** 흰 바탕 테두리 버튼. */
export const PRESS_OUTLINE = `${PRESS_BASE} active:bg-surface-2 active:scale-[0.98]`;
/** 보라 테두리 버튼 — 회색 대신 연보라로 눌러야 색이 튀지 않는다. */
export const PRESS_ACCENT = `${PRESS_BASE} active:bg-primary-soft active:scale-[0.98]`;
/** 먹색 버튼. 어둡게 하면 변화가 안 보여 밝게 뒤집는다. */
export const PRESS_INK = `${PRESS_BASE} active:bg-text-2 active:scale-[0.98]`;
/** 위험 버튼. */
export const PRESS_DANGER = `${PRESS_BASE} active:bg-danger-soft active:scale-[0.98]`;
/** 목록 행·시트 항목. scale 없음 — 옆 행과 어긋나 보인다. */
export const PRESS_ROW = `${PRESS_BASE} active:bg-surface-2`;
/** 칩. 작아서 조금 더 줄인다. */
export const PRESS_CHIP = `${PRESS_BASE} active:bg-surface-2 active:scale-[0.96]`;
/** 카드. 독립해 있어 미세한 scale이 읽힌다. */
export const PRESS_CARD = `${PRESS_BASE} active:bg-surface-2 active:scale-[0.985]`;
/** 아이콘 버튼 — 원형 배경이 보이는 크기. */
export const PRESS_ICON = `${PRESS_BASE} active:bg-surface-2`;
/** 배경이 없는 것 — 텍스트 버튼, 앱바 아이콘. */
export const PRESS_FADE = `${PRESS_BASE} active:opacity-55`;
/** 하단 탭. 바탕이 흰색이라 배경 변화가 보이지 않는다. 아이콘과 글자를 함께 흐린다. */
export const PRESS_TAB = `${PRESS_BASE} active:opacity-50`;

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

/**
 * z 계층 사다리 — 새 오버레이를 만들 때 이 표에서 고른다(#635).
 *
 * 값을 상수로 내보내지 않는 이유는 Tailwind가 클래스 문자열을 정적으로 스캔해야 해서다
 * (`z-[${N}]`은 빌드에서 사라진다). 그래서 표로만 둔다.
 *
 * | 층 | 용도 |
 * | --- | --- |
 * | 2~10 | 카드·갤러리 내부 장식(화살표·카운터·도트) |
 * | 250~260 | 목록 위 sticky 서브헤더·필터 줄 |
 * | 300 | 전역 헤더(`.hdr`)·모바일 헤더·모바일 탭바 |
 * | 350 | 관리자 모바일 전체 메뉴 |
 * | 400 | **모달·전체화면 오버레이·하단 고정 액션바** ← 새 모달의 기본값 |
 * | 410 | 사진 확대 라이트박스 |
 * | 500 | 모달 위에 겹치는 입력창(제안 금액 등), 그리고 **같은 화면에 z-400 하단 액션바가 있는 모달** |
 * | 600 | 그 입력창을 다시 덮는 확인 창 |
 *
 * 400 안에 모달과 하단 고정 액션바가 함께 있는 건 이 사다리의 약점이다. 같은 값끼리 겹치면
 * 승부가 DOM 순서로 갈리므로, 한 화면에서 둘이 만나면 모달을 500으로 올린다(경매 상세 신고).
 *
 * ⚠️ **z만으로는 부족하다.** `position: sticky`인 조상, `z-index`가 붙은 `absolute` 조상,
 * `transform`·`filter`·`opacity<1`인 조상은 모두 스택 컨텍스트를 만들고, 그 안의 오버레이는
 * z를 아무리 올려도 밖으로 나가지 못한다. 그런 자리에서 열리는 모달은 `createPortal(…,
 * document.body)`로 빼낸다 — #454(SellerOfferPanel)·#635(ReportButton)가 같은 함정이었다.
 */

/**
 * 폼 맨 끝 액션 버튼을 담는 줄(#683).
 *
 * <p>모바일에서는 화면 아래에 고정한다 — 매물 상세의 즉시구매 바와 같은 자리다. 긴 폼일수록
 * 「다음」을 찾으러 끝까지 굴려야 하는데, 다음 걸음이 어디 있는지는 화면을 떠나지 않아야 한다.
 *
 * <p>{@code bottom}을 인라인으로 주는 이유는 하단 5탭이 있는 화면과 없는 화면이 갈리기
 * 때문이다. 탭이 있으면 그 위에, 없으면 안전영역 위에 앉는다.
 *
 * <p>데스크탑에서는 다시 흐름 안으로 돌아간다(`sm:static`). 세로가 넉넉해 고정할 이유가 없고,
 * 넓은 화면 아래에 띠가 하나 걸리면 그게 더 눈에 띈다.
 */
export const FORM_ACTION_BAR =
  "fixed inset-x-0 z-[400] border-t border-border bg-white px-[14px] py-2.5 " +
  "sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-5";

export const FORM_ACTION_BAR_STYLE = { bottom: "var(--mobile-tabbar-h, env(safe-area-inset-bottom))" } as const;

/**
 * 고정 액션 바가 본문 끝을 가리지 않게 두는 여백(#685).
 *
 * <p>비워야 하는 높이는 <b>탭바 60 + 액션 바 68.8</b>이다(375px 실측). 액션 바가 탭바 위에
 * 앉으므로 둘을 더해야 한다 — 바 높이만 보고 96px을 뒀다가 마지막 입력칸이 가려졌다.
 *
 * <p>데스크탑에서는 바가 흐름으로 돌아가 여백이 필요 없다.
 */
export const FORM_ACTION_BAR_PAD = "pb-[136px] sm:pb-10";
