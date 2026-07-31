import type { MetadataRoute } from "next";
import { PRIVATE_PATHS, SITE_URL } from "@/lib/site";

// robots.txt가 아예 없어(404) 크롤러가 관리자 콘솔·마이페이지까지 긁고 있었다.
// 홍보를 시작하면 유입이 늘고 크롤 빈도도 올라가므로 지금 세워둔다.
//
// sitemap을 함께 알려주는 이유: 크롤러가 링크를 타고 발견하기를 기다리는 대신
// 공개 페이지 목록을 직접 건네 색인을 앞당긴다.
export default function robots(): MetadataRoute.Robots {
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
