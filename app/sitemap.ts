import type { MetadataRoute } from "next";
import { apiFetch } from "@/lib/api";
import { NOTICES } from "@/lib/notices-content";
import { SITE_URL } from "@/lib/site";
import type { ArtistListResponse, AuctionListResponse } from "@/lib/types";

// sitemap.xml이 없어(404) 크롤러가 링크를 타고 발견하기만을 기다리고 있었다.
// 홍보를 시작하는 시점이라 공개 페이지를 직접 건네 색인을 앞당긴다.
//
// 요청 시 생성하되 1시간 캐시한다 — 매 크롤마다 백엔드를 두 번씩 때릴 이유가 없고,
// 경매 목록이 1시간 늦게 반영되는 건 색인 관점에서 무의미한 차이다.
export const revalidate = 3600;

// 백엔드가 죽어도 sitemap 자체는 나가야 한다. 동적 항목만 비고 정적 목록은 유지한다
// — 여기서 예외가 나면 sitemap.xml이 통째로 500이 되어 크롤러가 아무것도 못 받는다.
async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch {
    return null;
  }
}

// 로그인 없이 볼 수 있는 고정 경로만. 개인 화면·관리자·중간 흐름은 robots.ts가 막는다.
const STATIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "hourly" },
  { path: "/intro", priority: 0.9, changeFrequency: "weekly" },
  { path: "/auctions", priority: 0.9, changeFrequency: "hourly" },
  { path: "/instant-sales", priority: 0.8, changeFrequency: "hourly" },
  { path: "/auctions/ended", priority: 0.5, changeFrequency: "daily" },
  { path: "/artists", priority: 0.7, changeFrequency: "weekly" },
  { path: "/sellers", priority: 0.6, changeFrequency: "daily" },
  { path: "/guide", priority: 0.5, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
  { path: "/notices", priority: 0.4, changeFrequency: "weekly" },
  { path: "/login", priority: 0.3, changeFrequency: "yearly" },
  { path: "/signup", priority: 0.4, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/policy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((s) => ({
    url: `${SITE_URL}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  // 공지 상세(#300) — 약관 개정 고지처럼 링크로 공유되는 문서라 개별 주소도 색인 대상이다.
  // 콘텐츠가 정적이라 API 호출 없이 그대로 넣는다. lastModified는 게시일을 쓴다 — 지금 시각을
  // 넣으면 바뀌지 않은 공지가 매번 갱신된 것으로 보인다.
  for (const notice of NOTICES) {
    entries.push({
      url: `${SITE_URL}/notices/${notice.slug}`,
      lastModified: new Date(notice.date),
      changeFrequency: "yearly",
      priority: 0.3,
    });
  }

  // 스타 상세 — 카탈로그는 자주 바뀌지 않고 개수도 적어 전부 넣는다.
  const artists = await safeFetch<ArtistListResponse>("/api/artists?size=200");
  for (const artist of artists?.content ?? []) {
    entries.push({
      url: `${SITE_URL}/artists/${artist.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  // 진행 중인 매물 — 종료되면 사라지지만 종료 경매 상세도 공개라 색인 가치가 있다.
  // 다만 목록이 계속 바뀌므로 상한을 두고 최신 것 위주로만 싣는다(sitemap 크기 관리).
  for (const saleType of ["AUCTION", "INSTANT"] as const) {
    const auctions = await safeFetch<AuctionListResponse>(`/api/auctions?saleType=${saleType}&size=200`);
    for (const auction of auctions?.content ?? []) {
      entries.push({
        url: `${SITE_URL}/auctions/${auction.id}`,
        lastModified: now,
        changeFrequency: "hourly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
