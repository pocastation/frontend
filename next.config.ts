import type { NextConfig } from "next";

// 로컬 개발용 백엔드 오리진. 배포에서는 이 rewrite 자체가 붙지 않는다.
const LOCAL_BACKEND = process.env.LOCAL_BACKEND_ORIGIN ?? "http://localhost:8080";

/**
 * 응답 보안 헤더(#585). 2026-09-07 보안 점검에서 pocastation.com 응답이 Vercel 기본 HSTS뿐이라는 것이 실측됐다 —
 * API(api.pocastation.com)는 nosniff·X-Frame DENY를 주는데 프론트만 비어 있었다.
 *
 * - X-Frame-Options DENY: 이 사이트는 어디에도 iframe으로 들어가지 않는다. 결제·본인확인 팝업은 새 창이라 무관
 * - X-Content-Type-Options nosniff: MIME 추측 차단
 * - Referrer-Policy strict-origin-when-cross-origin: 이메일 인증·비밀번호 재설정처럼 토큰이 URL에 있는 페이지에서
 *   외부로 나갈 때 경로·쿼리를 떼고 origin만 보낸다
 * - Permissions-Policy: 카메라·마이크·위치·Payment Request API는 쓰지 않는다(사진·영상은 파일 업로드, 결제는 포트원 창)
 *
 * CSP는 여기 없다. Next.js 인라인 스크립트 때문에 nonce 미들웨어가 필요하고, 포트원·다음 우편번호·Vercel analytics
 * 허용 목록을 실트래픽으로 검증해야 한다 — Report-Only 도입은 별도 이슈.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // 프레임워크 지문(X-Powered-By: Next.js)을 내지 않는다(#585).
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  /**
   * 개발 환경에서만 백엔드를 같은 출처로 붙인다.
   *
   * <p>로컬은 프론트가 :3000, 백엔드가 :8080이라 브라우저 입장에서 **다른 출처**다. 그래서
   * CORS 프리플라이트를 타고, 리프레시 쿠키가 브라우저·확장·프라이버시 설정에 따라 저장되거나
   * 전송되지 않는 경우가 생긴다. 실제로 인앱 브라우저에서 로그인 상태가 유지되지 않아
   * 프론트 검증이 세 번 막혔다(FE #267·#269·#271).
   *
   * <p>rewrite로 `/api`·`/oauth2`·`/login/oauth2`·`/media`를 프록시하면 브라우저가 보는 출처가
   * `localhost:3000` 하나가 된다 — 쿠키는 1st-party가 되고 CORS는 아예 발생하지 않는다.
   * **배포 환경의 동작은 바뀌지 않는다**(`api.pocastation.com`으로 직접 나가는 그대로다).
   *
   * <p>백엔드를 staging에 붙여 보고 싶으면 `NEXT_PUBLIC_API_URL`을 명시하면 된다 —
   * 그 값이 있으면 프론트가 절대 URL로 직접 호출해 이 프록시를 지나가지 않는다.
   */
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    return [
      { source: "/api/:path*", destination: `${LOCAL_BACKEND}/api/:path*` },
      // OAuth는 브라우저 전체 이동이라 fetch 래퍼를 타지 않는다 — 경로를 따로 열어둔다.
      { source: "/oauth2/:path*", destination: `${LOCAL_BACKEND}/oauth2/:path*` },
      { source: "/login/oauth2/:path*", destination: `${LOCAL_BACKEND}/login/oauth2/:path*` },
      // 로컬 스토리지 모드(STORAGE_TYPE=local)에서 백엔드가 직접 서빙하는 업로드 파일.
      { source: "/media/:path*", destination: `${LOCAL_BACKEND}/media/:path*` },
    ];
  },
};

export default nextConfig;
