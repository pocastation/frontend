import ArtistExplorer from "@/components/ArtistExplorer";
import { apiFetch } from "@/lib/api";
import type { ArtistListResponse } from "@/lib/types";

export const metadata = { title: "아티스트 — Pocastation" };

async function getArtists(): Promise<ArtistListResponse | null> {
  try {
    return await apiFetch<ArtistListResponse>("/api/artists?size=24", { cache: "no-store" });
  } catch {
    return null;
  }
}

export default async function ArtistsPage() {
  const artists = await getArtists();

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-8 sm:py-10">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">아티스트</h1>
        <p className="mt-1.5 text-sm text-text-3">좋아하는 아티스트의 포토카드를 찾아보세요.</p>
      </div>

      <ArtistExplorer
        initialArtists={artists?.content ?? []}
        initialTotalElements={artists?.totalElements ?? 0}
        initialTotalPages={artists?.totalPages ?? 0}
      />
    </div>
  );
}
