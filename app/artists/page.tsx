import ArtistExplorer from "@/components/ArtistExplorer";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import SuggestArtistButton from "@/components/SuggestArtistButton";
import { apiFetch } from "@/lib/api";
import type { ArtistListResponse } from "@/lib/types";

export const metadata = { title: "스타 — Pocastation" };

async function getArtists(): Promise<ArtistListResponse | null> {
  try {
    return await apiFetch<ArtistListResponse>("/api/artists?size=24", { cache: "no-store" });
  } catch {
    return null;
  }
}

/**
 * 스타 목록(#499).
 *
 * <p>모바일은 앱바 하나짜리 서브 화면이다 — 하단 5탭이 가리키는 루트가 아니라 검색 화면의
 * 「인기 스타 더보기」와 데스크탑 헤더로 들어오는 자리다. 뒤로는 <b>히스토리 뒤로</b>다
 * (여러 경로에서 들어오므로 누른 자리로 돌아가는 게 맞다 — 알림함과 같은 판단).
 *
 * <p>데스크탑은 지금까지처럼 제목·부제를 둔다. 모바일에서 그 둘을 다시 쓰지 않는 이유는
 * <b>앱바가 이미 제목이기 때문</b>이다(당근·번개장터·토스가 쓰는 문법).
 */
export default async function ArtistsPage() {
  const artists = await getArtists();

  return (
    <>
      <MobilePageHead title="스타" />

      <div className="mx-auto max-w-[1160px] px-[14px] py-5 sm:px-4 sm:py-10">
        <div className="mb-7 hidden sm:block">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">스타</h1>
          <p className="mt-1.5 text-sm text-text-3">좋아하는 스타의 포토카드를 찾아보세요.</p>
        </div>

        <ArtistExplorer
          initialArtists={artists?.content ?? []}
          initialTotalElements={artists?.totalElements ?? 0}
          initialTotalPages={artists?.totalPages ?? 0}
        />

        <SuggestArtistButton />
      </div>
    </>
  );
}
