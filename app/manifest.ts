import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

/**
 * PWA 매니페스트 — 홈 화면에 설치했을 때의 정체성.
 *
 * <p>`display: standalone`이라 설치 후에는 주소창·탭 없이 열린다. 모바일 앱 셸(하단 5탭)이
 * 그 안에서 1차 내비게이션을 맡는다.
 *
 * <p>**색이 두 개인 이유가 다르다.**
 * - `theme_color`(상태바)는 **흰색**이다. 모바일 상단바가 흰색이라 보라로 두면 화면 위쪽에만
 *   보라 띠가 생겨 앱이 깨져 보인다.
 * - `background_color`(스플래시 지면)는 **딥스페이스**다. 브랜드 면(스플래시·로고)은 딥스페이스라는
 *   디자인 시스템 규칙에 맞고, 앱을 여는 순간이 브랜드가 나오는 유일한 자리다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "포카스테이션 — K-POP 포카 경매",
    // 홈 화면 아이콘 아래에 붙는 이름. 길면 잘리므로 서비스명만 둔다.
    short_name: "포카스테이션",
    description: SITE_DESCRIPTION,
    lang: "ko",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#ffffff",
    background_color: "#160c2e",
    categories: ["shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // maskable은 안드로이드가 원형·둥근사각 등으로 잘라내는 전제라 안전영역(중앙 80%) 안에만
      // 그림이 있다. any와 같은 파일을 쓰면 기기에 따라 별 끝이 잘린다.
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "진행 중인 경매", url: "/auctions" },
      { name: "즉시판매", url: "/instant-sales" },
      { name: "관심 목록", url: "/mypage?tab=wishlist" },
    ],
  };
}
