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
