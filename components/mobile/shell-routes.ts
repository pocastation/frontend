// 모바일 앱 셸(상단바 48px + 하단 5탭)이 적용된 라우트 목록.
//
// 이 목록에 있는 경로에서만 데스크탑 헤더를 모바일 폭에서 접는다. ⚠️ 푸터는 더 이상 접지
// 않는다(#399) — 전상법 §10 표시사항이라 전 화면에 뜬다. 전역 레이아웃을
// 갈아엎지 않고 **페이지를 하나씩 이행**하기 위한 스위치다 — 모바일 화면을 끝낸 페이지를
// 여기에 한 줄씩 추가하면 된다. 목록에 없는 경로는 지금까지와 똑같이 동작한다.
export const MOBILE_SHELL_ROUTES: readonly string[] = ["/", "/auctions", "/instant-sales", "/mypage"];

export function isMobileShellRoute(pathname: string): boolean {
  return MOBILE_SHELL_ROUTES.includes(pathname);
}

// 모바일에서 **전역 헤더를 접는** 화면. 셸 라우트(홈·목록)는 상단바 48px + 하단 5탭이
// 대신하고, 매물 상세는 킷대로 사진 위 뒤로가기 하나로 들어가고 나온다 — 상세에 헤더가
// 뜨면 사진이 화면 위에서 밀린다.
//
// ⚠️ 이름이 「Chrome」인데 지금은 헤더만 가른다. 푸터는 #399에서 이 판단에서 빼냈다 —
// 전상법 §10 표시사항이라 모바일에서도 전 화면에 떠야 한다. 함수명을 바꾸지 않은 이유는
// 헤더 쪽 호출부가 그대로이고, 이름을 갈면 이 이력이 diff에서 흩어지기 때문이다.
const MOBILE_DETAIL_PATTERN = /^\/auctions\/\d+$/;
// 스타 상세(#499)도 앱바 하나로 들어가고 나온다. 매물 상세와 달리 큰 사진이 위에 깔리지 않아
// 앱바를 두고, 거기에 스타 이름을 실어 스크롤해도 누구를 보는지 잃지 않게 한다.
const MOBILE_ARTIST_DETAIL_PATTERN = /^\/artists\/\d+$/;
// 결제(#502)도 앱바 하나짜리 화면이다. 하단에 결제 바가 고정되므로 하단탭이 함께 뜨면 두 줄이
// 겹치고, 결제는 다른 곳으로 새지 않아야 하는 몰입 동작이라 탭을 띄우지 않는다.
const MOBILE_PAYMENT_PATTERN = /^\/orders\/\d+\/payment$/;
// 판매자 공개 프로필(#510). id가 UUID라 숫자 패턴을 쓸 수 없다 — 한 조각짜리 경로로 잡는다.
const MOBILE_SELLER_DETAIL_PATTERN = /^\/sellers\/[^/]+$/;
// 마이페이지(`/mypage`)는 한 경로가 두 얼굴이다 — 쿼리가 없거나 `?tab=wishlist`면 하단탭이 가리키는
// **루트**라 셸을 쓰고, 그 밖의 `?tab=`은 앱바 하나짜리 **서브 화면**이다. 어느 쪽이든 전역 헤더·
// 푸터는 접혀야 해서 경로 단위 목록에 그대로 둔다(분기는 페이지가 쿼리를 보고 한다).
//
// 판매 등록도 같다 — 킷은 위저드 머리에 닫기(X)를 두고 전역 크롬을 걷는다.
//
// 알림함(`/notifications`)은 하단탭이 가리키는 루트가 아니라 **상단바의 종이 가리키는 서브 화면**이다.
// 셸(상단바+하단탭)이 아니라 MobilePageHead 앱바 하나로 들어가고 나온다(#393).
//
// 검색(`/search`)도 같다 — 상단바의 돋보기가 가리키는 서브 화면이고, 앱바가 제목 대신 입력창을
// 갖는다(#493). 하단탭을 띄우지 않는 이유는 알림함과 같다: 루트 탭이 가리키는 자리가 아니고,
// 검색은 빠져나갈 길이 뒤로 하나면 충분한 몰입 동작이다.
const MOBILE_FULLSCREEN_ROUTES: readonly string[] = ["/auctions/new", "/notifications", "/search", "/artists", "/sellers", "/auctions/ended"];

export function isMobileChromeHiddenRoute(pathname: string): boolean {
  return (
    isMobileShellRoute(pathname) ||
    MOBILE_DETAIL_PATTERN.test(pathname) ||
    MOBILE_ARTIST_DETAIL_PATTERN.test(pathname) ||
    MOBILE_PAYMENT_PATTERN.test(pathname) ||
    MOBILE_SELLER_DETAIL_PATTERN.test(pathname) ||
    MOBILE_FULLSCREEN_ROUTES.includes(pathname)
  );
}
