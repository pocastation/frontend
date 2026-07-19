import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import ArtistAuctionGrid from "@/components/ArtistAuctionGrid";
import { apiFetch, ApiError, mediaUrl } from "@/lib/api";
import { ARTIST_STATUS_BADGE_CLASS, ARTIST_STATUS_LABEL, ARTIST_TYPE_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ArtistDetailResponse, AuctionListResponse } from "@/lib/types";

// cache()로 감싸 generateMetadata와 본문이 한 번만 페치하도록 dedup.
const getArtist = cache(async (id: string): Promise<ArtistDetailResponse | null> => {
  try {
    return await apiFetch<ArtistDetailResponse>(`/api/artists/${id}`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
});

// 링크 미리보기 — 스타명·설명. 스타 공식 이미지는 저작권으로 미사용(§9.1)이라 기본 OG 이미지를 상속한다.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const artist = await getArtist(id);
  if (!artist) {
    return { title: "스타를 찾을 수 없어요 — Pocastation" };
  }
  const description = `${artist.name} 포토카드 경매·즉시판매 — Pocastation`;
  return {
    title: `${artist.name} — Pocastation`,
    description,
    openGraph: { title: `${artist.name} — Pocastation`, description, type: "website" },
    twitter: { card: "summary_large_image", title: `${artist.name} — Pocastation`, description },
  };
}

// 아티스트id로 직접 필터하는 경매 API가 없어, 경매 상세의 "다른 경매 보기"(SearchLink)와 같은
// 방식으로 아티스트명 검색을 재사용한다(auction↔catalog 직접 조인 없이 기존 인프라 그대로).
async function getArtistAuctions(artistName: string): Promise<AuctionListResponse | null> {
  try {
    const params = new URLSearchParams({ q: artistName, sort: "latest", size: "6" });
    return await apiFetch<AuctionListResponse>(`/api/auctions?${params}`, { cache: "no-store" });
  } catch {
    return null;
  }
}

function MetaRow({ icon, label, value, valueClassName }: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[13.5px]">
      <span className="shrink-0 text-text-3">{icon}</span>
      <span className="min-w-[62px] text-text-3">{label}</span>
      <span className={`font-bold text-text-1 ${valueClassName ?? ""}`}>{value}</span>
    </div>
  );
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await getArtist(id);
  if (!artist) {
    notFound();
  }

  const auctions = await getArtistAuctions(artist.name);
  const activeMembers = artist.members.filter((m) => m.active);
  const withdrawnMembers = artist.members.filter((m) => !m.active);

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-6 sm:py-8">
      <Link
        href="/artists"
        className={`mb-4 inline-flex items-center gap-1 rounded-r2 px-1 py-1 text-xs font-semibold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
      >
        <span aria-hidden="true">←</span> 스타 목록으로
      </Link>

      <div className="flex flex-col gap-6 rounded-r4 border border-border bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:p-8">
        <span className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-full bg-surface-2 sm:h-[148px] sm:w-[148px]">
          {artist.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
            <img src={mediaUrl(artist.imageUrl)} alt="" className="h-full w-full object-cover" />
          )}
        </span>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <span
            className={`mb-2.5 inline-block rounded-full px-2.5 py-1 text-xs font-extrabold ${ARTIST_STATUS_BADGE_CLASS[artist.status]}`}
          >
            {ARTIST_STATUS_LABEL[artist.status]}
          </span>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
            <h1 className="font-display text-[26px] font-extrabold tracking-tight text-text-1">{artist.name}</h1>
            {artist.nameEn && <span className="text-sm font-semibold text-text-3">{artist.nameEn}</span>}
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">
              {ARTIST_TYPE_LABEL[artist.type]}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {artist.agency && (
              <MetaRow
                label="소속사"
                value={artist.agency}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M3 21h18M6 21V8l6-4 6 4v13M10 21v-6h4v6" />
                  </svg>
                }
              />
            )}
            {artist.fandomName && (
              <MetaRow
                label="팬덤명"
                value={artist.fandomName}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
                  </svg>
                }
              />
            )}
            {artist.debutDate && (
              <MetaRow
                label="데뷔일"
                value={artist.debutDate}
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                }
              />
            )}
            <MetaRow
              label="활동 상태"
              value={ARTIST_STATUS_LABEL[artist.status]}
              valueClassName={artist.status === "ACTIVE" ? "text-ok" : undefined}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M3 13a9 9 0 0 1 18 0" />
                  <path d="M12 13l4-4" />
                  <circle cx="12" cy="13" r="1" />
                </svg>
              }
            />
          </div>
        </div>
      </div>

      {artist.members.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-[17px] font-extrabold text-text-1">멤버</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[...activeMembers, ...withdrawnMembers].map((member) => (
              <div key={member.idolId} className="flex w-24 shrink-0 flex-col items-center text-center">
                <span
                  className={`mb-2 h-[72px] w-[72px] overflow-hidden rounded-full bg-surface-2 ${
                    member.active ? "" : "grayscale opacity-45"
                  }`}
                >
                  {member.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
                    <img src={mediaUrl(member.imageUrl)} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <p className={`text-xs font-bold ${member.active ? "text-text-1" : "text-text-3"}`}>
                  {member.stageName}
                </p>
                {!member.active && (
                  <span className="mt-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9.5px] font-extrabold text-text-3">
                    탈퇴
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[17px] font-extrabold text-text-1">{artist.name}의 진행 중인 경매</h2>
        </div>
        <ArtistAuctionGrid auctions={auctions?.content ?? []} />
      </section>
    </div>
  );
}
