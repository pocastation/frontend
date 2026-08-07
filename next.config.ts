import type { NextConfig } from "next";

// 로컬 개발용 백엔드 오리진. 배포에서는 이 rewrite 자체가 붙지 않는다.
const LOCAL_BACKEND = process.env.LOCAL_BACKEND_ORIGIN ?? "http://localhost:8080";

const nextConfig: NextConfig = {
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
