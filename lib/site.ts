import { envValue } from "./env";

// 사이트 정체성 상수. layout(메타데이터)·robots·sitemap이 같은 값을 봐야 해서 한곳에 모은다
// — 세 곳에 각각 두면 도메인이 바뀔 때 하나만 고쳐 sitemap의 URL이 어긋나는 식으로 조용히 틀어진다.

// 배포 환경별 절대 URL 기준. Vercel에 NEXT_PUBLIC_SITE_URL을 주입하고, 없으면 폴백한다.
export const SITE_URL =
  envValue(process.env.NEXT_PUBLIC_SITE_URL) ||
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://pocastation.com");

// 상용 지면인지. `NEXT_PUBLIC_SITE_URL`이 상용 도메인일 때만 참이다.
//
// 배포 게이트를 세우면서 `staging.pocastation.com`이 `develop`을 미리 보여주는 자리가 됐다.
// 그 지면은 **상용과 같은 내용을 서빙하고 실 DB를 본다** — 그래서 두 가지를 갈라야 한다.
// ① 크롤러에게 통째로 닫는다(중복 콘텐츠 + 검색으로 프리프로덕션에 유입되는 것을 막는다)
// ② 화면 맨 위에 여기가 어디인지 띄운다(거기서 만든 제안·주문은 진짜다)
export const IS_PRODUCTION_SITE = SITE_URL === "https://pocastation.com";

/**
 * 브랜드 확정 카피(디자인 시스템 CONTENT FUNDAMENTALS). **임의로 고쳐 쓰지 않는다.**
 *
 * <p>모바일 홍보 배너 1장과 데스크탑 히어로가 **같은 문장을 쓴다.** 각자 들고 있던 시절에
 * 두 지면이 서로 다른 말을 했다 — 모바일은 «포카 한 장에도 확인이 필요하니까», 데스크탑은
 * «우주에서 만나는 …». 브랜드 문장은 지면마다 다를 이유가 없어 한곳으로 모았다.
 *
 * <p>마지막 줄만 강조색(nebula)을 받는다. 지면 크기는 각자 정하되 **줄 나눔과 강조 위치는 공유**한다.
 */
export const BRAND_HEADLINE_LINES = ["포카 한 장에도", "확인이 필요하니까,", "포카스테이션"];
export const BRAND_SUBHEAD = "안전결제와 판매자 상태 등급 고지로,\n처음 거래해도 걱정 없이";

export const SITE_NAME = "Pocastation";
export const SITE_TITLE = "Pocastation — K-POP 포카 거래";
export const SITE_DESCRIPTION = "K-pop 포토카드 특화 거래 플랫폼";

/**
 * 공식 X(구 트위터) 계정 핸들. `@`를 포함해 적는다(예: `"@pocastation"`).
 *
 * <p>두 곳에 쓰인다 — ① `twitter:site` 메타로 <b>카드 하단에 출처 계정</b>이 붙는다
 * ② 공유 문구의 `via @…`. 둘 다 <b>값이 있을 때만</b> 나가므로 미확보 상태에서 빈 값이
 * 새어나가지 않는다.
 *
 * <p>타입은 `string | null`로 둔다 — 계정이 바뀌거나 잠기면 다시 `null`로 내리는 것이
 * 잘못된 핸들을 내보내는 것보다 낫다. 두 소비처 모두 null 가드가 이미 있다.
 */
export const X_HANDLE = "@pocastation" as string | null;

/**
 * 기본 링크 미리보기 이미지(루트 `app/opengraph-image.tsx`).
 *
 * <p><b>페이지에서 `openGraph`를 정의하면 Next.js가 파일 기반 OG 이미지 자동 주입을 덮어써
 * og:image가 통째로 빠진다.</b> `summary_large_image` 카드에 이미지가 없으면 미리보기가 비어 보인다.
 * 자체 이미지가 없는 페이지가 `openGraph`를 쓸 때는 이 값을 `images`에 넣어 기본 카드를 되살린다.
 *
 * <p>자체 카드를 두고 싶으면 그 세그먼트에 `opengraph-image.tsx`를 만들면 된다(`/intro`가 그 예).
 */
export const DEFAULT_OG_IMAGE = "/opengraph-image";

/**
 * 검색엔진이 크롤·색인하면 안 되는 경로.
 *
 * <p>세 부류다 — ① 로그인해야 내용이 보이는 개인 화면(마이페이지·알림·문의) ② 관리자 콘솔
 * ③ 인증·온보딩 같은 중간 흐름(내용이 없거나 일회성 토큰이 붙는다).
 *
 * <p>robots.txt의 Disallow는 <b>크롤을 막을 뿐 색인을 보장해 막지는 않는다</b> —
 * 외부 링크로 URL이 발견되면 내용 없이 주소만 검색결과에 뜰 수 있다. 다만 이 경로들은
 * 비로그인 접근 시 보여줄 내용 자체가 없어 실질 노출 위험이 낮다.
 */
export const PRIVATE_PATHS = [
  "/admin",
  "/mypage",
  "/notifications",
  "/inquiries",
  "/onboarding",
  "/auth",
  "/auctions/new",
  "/auctions/submitted",
] as const;
