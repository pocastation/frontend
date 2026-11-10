import SearchScreen from "@/components/SearchScreen";
import { apiFetch } from "@/lib/api";
import type { ArtistListResponse, AuctionListResponse } from "@/lib/types";

export const metadata = { title: "검색 — Pocastation" };

/** 칩 줄에 올리는 스타 수. SearchScreen의 상한과 같은 값이어야 결과가 어긋나지 않는다. */
const ARTIST_LIMIT = 12;

/** 검색 전 화면의 인기 스타. 4열 두 줄. */
const POPULAR_LIMIT = 8;

/**
 * 🔴 제안·즉시를 함께 본다(`saleType=ALL`, BE #418). 검색은 「어디에 있든 찾는」 동작이라
 * 유형으로 갈리면 안 된다 — 찾는 카드가 다른 탭에 있으면 없는 것처럼 보인다.
 */
async function getAuctions(query: string): Promise<AuctionListResponse | null> {
  const params = new URLSearchParams({ saleType: "ALL", sort: "recommended", size: "20" });
  params.set("q", query);
  try {
    return await apiFetch<AuctionListResponse>(`/api/auctions?${params}`, { cache: "no-store" });
  } catch {
    return null;
  }
}

async function getArtists(query: string, size: number): Promise<ArtistListResponse | null> {
  const params = new URLSearchParams({ size: String(size) });
  if (query) params.set("q", query);
  try {
    // q가 없으면 판매량 내림차순이 그대로 「인기 스타」다 — 별도 API가 필요 없다.
    return await apiFetch<ArtistListResponse>(`/api/artists?${params}`, { cache: "no-store" });
  } catch {
    return null;
  }
}

/**
 * 검색 화면(#493).
 *
 * <p>`?q=`를 서버에서 미리 조회한다. 검색 결과 링크를 공유하거나 새로고침해도 결과가 그대로
 * 뜨게 하려는 것이고, 클라이언트가 마운트된 뒤 다시 부르지 않아 첫 화면이 한 박자 늦게 차는
 * 일이 없다.
 *
 * <p>모바일에서는 앱바 하나짜리 서브 화면이다(`MOBILE_FULLSCREEN_ROUTES`). 데스크탑은 전역
 * 헤더가 그대로 뜨고 본문만 가운데로 모인다 — 데스크탑에는 이미 헤더 검색이 있어서 이 화면을
 * 따로 안내하지 않지만, 공유된 링크로 들어와도 멀쩡히 동작해야 한다.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  // 검색어가 있을 때만 매물·매칭 스타를 미리 부른다. 없으면 인기 스타만 있으면 된다.
  const [auctions, matched, popular] = await Promise.all([
    query ? getAuctions(query) : Promise.resolve(null),
    query ? getArtists(query, ARTIST_LIMIT) : Promise.resolve(null),
    getArtists("", POPULAR_LIMIT),
  ]);

  return (
    <SearchScreen
      initialQuery={query}
      initialAuctions={auctions?.content ?? []}
      initialTotalElements={auctions?.totalElements ?? 0}
      initialTotalPages={auctions?.totalPages ?? 0}
      initialMatchedArtists={matched?.content ?? []}
      popularArtists={popular?.content ?? []}
    />
  );
}
