// 모바일 앱 셸(상단바 48px + 하단 5탭)이 적용된 라우트 목록.
//
// 이 목록에 있는 경로에서만 데스크탑 헤더·푸터를 모바일 폭에서 접는다. 전역 레이아웃을
// 갈아엎지 않고 **페이지를 하나씩 이행**하기 위한 스위치다 — 모바일 화면을 끝낸 페이지를
// 여기에 한 줄씩 추가하면 된다. 목록에 없는 경로는 지금까지와 똑같이 동작한다.
export const MOBILE_SHELL_ROUTES: readonly string[] = ["/"];

export function isMobileShellRoute(pathname: string): boolean {
  return MOBILE_SHELL_ROUTES.includes(pathname);
}
