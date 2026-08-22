import type { MetadataRoute } from "next";
import { IS_PRODUCTION_SITE, PRIVATE_PATHS, SITE_URL } from "@/lib/site";

// robots.txt가 아예 없어(404) 크롤러가 관리자 콘솔·마이페이지까지 긁고 있었다.
// 홍보를 시작하면 유입이 늘고 크롤 빈도도 올라가므로 지금 세워둔다.
//
// sitemap을 함께 알려주는 이유: 크롤러가 링크를 타고 발견하기를 기다리는 대신
// 공개 페이지 목록을 직접 건네 색인을 앞당긴다.
export default function robots(): MetadataRoute.Robots {
  // 상용이 아닌 지면(staging·로컬)은 통째로 닫는다. staging은 상용과 **같은 내용**을 서빙하므로
  // 색인되면 중복 콘텐츠가 되고, 검색 결과를 타고 들어온 사용자가 자기도 모르게
  // 프리프로덕션에서 진짜 입찰을 하게 된다. sitemap도 알려주지 않는다.
  if (!IS_PRODUCTION_SITE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_PATHS],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
