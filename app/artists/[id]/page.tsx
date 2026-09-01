import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AuctionGrid from "@/components/AuctionGrid";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { apiFetch, ApiError, mediaUrl } from "@/lib/api";
import { ARTIST_STATUS_LABEL, ARTIST_TYPE_LABEL } from "@/lib/labels";
import { DEFAULT_OG_IMAGE } from "@/lib/site";
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

// 링크 미리보기 — 스타명·설명. 스타 공식 이미지는 저작권으로 쓰지 않으므로(§9.1) 브랜드 기본 카드를 쓴다.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const artist = await getArtist(id);
  if (!artist) {
    return { title: "스타를 찾을 수 없어요 — Pocastation" };
  }
  const description = `${artist.name} 포토카드 제안판매·즉시판매 — Pocastation`;
  return {
    title: `${artist.name} — Pocastation`,
    description,
    // images를 명시하지 않으면 루트 OG 이미지 자동 주입이 끊겨 og:image가 통째로 빠진다
    // (twitter:card가 summary_large_image라 미리보기가 비어 보인다). 스타 공식 이미지는
    // 저작권으로 쓰지 않으므로(§9.1) 브랜드 기본 카드를 쓴다.
    openGraph: {
      title: `${artist.name} — Pocastation`,
      description,
      type: "website",
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: `${artist.name} — Pocastation`, description },
  };
}

// 아티스트id로 직접 필터하는 경매 API가 없어, 경매 상세의 "다른 경매 보기"(SearchLink)와 같은
// 방식으로 아티스트명 검색을 재사용한다(auction↔catalog 직접 조인 없이 기존 인프라 그대로).
async function getArtistAuctions(artistName: string): Promise<AuctionListResponse | null> {
  try {
    // 🔴 saleType=ALL을 명시한다(#499, BE #418). 예전에는 이 파라미터가 없어 서버 기본값인
    // AUCTION만 걸렸고, **즉시판매가 통째로 빠져 있었다** — 「이 스타의 매물」이 그 스타의
    // 전부를 보여주지 않았던 것이다. 서버 기본값은 하위호환 때문에 AUCTION으로 두었으므로
    // (T60) 통합이 필요한 호출부가 명시하는 것이 규칙이다.
    const params = new URLSearchParams({ q: artistName, saleType: "ALL", sort: "latest", size: "6" });
    return await apiFetch<AuctionListResponse>(`/api/auctions?${params}`, { cache: "no-store" });
  } catch {
    return null;
  }
}


/**
 * 정보 한 줄 — 「라벨 : 값」. 헤어라인으로 행을 나눈다.
 *
 * <p>예전에는 항목마다 장식 아이콘(건물·하트·달력·게이지)을 달았는데 걷어냈다(#499).
 * 라벨이 이미 무엇인지 말하고 있어 아이콘이 더하는 정보가 없고, 이 레포의 디자인 규칙이
 * 장식용 아이콘을 금지한다.
 */
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-border py-2.5 text-[13px]">
      <span className="w-[62px] shrink-0 text-text-3">{label}</span>
      <span className="min-w-0 font-bold text-text-1">{value}</span>
    </div>
  );
}

/** 섹션을 끊는 8px 회색 띠. 모바일 전용 — 데스크탑은 여백과 헤어라인으로 충분하다. */
function Band() {
  return <div aria-hidden="true" className="mt-5 h-2 bg-surface-2 sm:hidden" />;
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
  // 이미지가 없는 스타가 대부분이라 원을 비워 두지 않는다. 「(여자)아이들」이 「여자」로
  // 읽히지 않게 괄호·공백을 먼저 턴다(ArtistRow와 같은 처리).
  const initials = artist.name.replace(/[()\s]/g, "").slice(0, 2);

  return (
    <>
      {/* 모바일은 앱바에 스타 이름을 싣는다 — 스크롤해도 누구를 보고 있는지 잃지 않는다. */}
      <MobilePageHead title={artist.name} backHref="/artists" />

      <div className="mx-auto max-w-[1160px] px-[14px] pb-10 pt-4 sm:px-4 sm:py-8">
        <Link
          href="/artists"
          className={`mb-4 hidden items-center gap-1 rounded-r2 px-1 py-1 text-xs font-semibold text-text-3 transition-colors hover:text-text-1 sm:inline-flex ${FOCUS_RING}`}
        >
          <span aria-hidden="true">←</span> 스타 목록으로
        </Link>

        {/*
          프로필을 감싸던 그림자 카드를 걷어냈다(#499). 모바일에서 카드는 화면 폭을 거의 다
          쓰므로 감싸는 의미가 없고 여백만 먹는다. 지면은 헤어라인과 회색 띠로 나눈다.
        */}
        <div className="flex items-center gap-4 sm:gap-6">
          <span
            aria-hidden={artist.imageUrl ? undefined : "true"}
            className="grid h-[84px] w-[84px] shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 font-display text-[20px] font-extrabold text-text-3 sm:h-[112px] sm:w-[112px] sm:text-[26px]"
          >
            {artist.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
              <img src={mediaUrl(artist.imageUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="font-display text-[21px] font-extrabold tracking-[-0.03em] text-text-1 sm:text-[28px]">
                {artist.name}
              </h1>
              {artist.nameEn && <span className="text-[12px] font-semibold text-text-3 sm:text-sm">{artist.nameEn}</span>}
            </div>
            {/* 타입·활동상태를 같은 무게의 뉴트럴 태그로 둔다 — 예전에는 타입만 연보라 알약이라
                정보 중요도와 무관하게 그것만 튀었다. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-r1 border border-border-2 px-1.5 py-px text-[10.5px] font-bold text-text-2">
                {ARTIST_TYPE_LABEL[artist.type]}
              </span>
              <span className="rounded-r1 border border-border-2 px-1.5 py-px text-[10.5px] font-bold text-text-2">
                {ARTIST_STATUS_LABEL[artist.status]}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 sm:max-w-[640px] sm:grid sm:grid-cols-2 sm:gap-x-10">
          {artist.agency && <MetaRow label="소속사" value={artist.agency} />}
          {artist.fandomName && <MetaRow label="팬덤명" value={artist.fandomName} />}
          {artist.debutDate && <MetaRow label="데뷔일" value={artist.debutDate} />}
        </div>

        {artist.members.length > 0 && (
          <>
            <Band />
            <section className="mt-5 sm:mt-8">
              <h2 className="text-sm font-extrabold tracking-[-0.02em] text-text-1 sm:text-[17px]">
                멤버 {artist.members.length}
              </h2>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {[...activeMembers, ...withdrawnMembers].map((member) => (
                  <div key={member.idolId} className="flex w-[64px] shrink-0 flex-col items-center text-center">
                    <span
                      className={`grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-surface-2 font-display text-[12px] font-extrabold text-text-3 ${
                        member.active ? "" : "opacity-45 grayscale"
                      }`}
                    >
                      {member.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
                        <img src={mediaUrl(member.imageUrl)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        member.stageName.slice(0, 2)
                      )}
                    </span>
                    <p className={`mt-1.5 w-full truncate text-[11px] font-bold ${member.active ? "text-text-2" : "text-text-3"}`}>
                      {member.stageName}
                    </p>
                    {!member.active && <span className="text-[9.5px] font-bold text-text-3">탈퇴</span>}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <Band />
        <section className="mt-5 sm:mt-8">
          <h2 className="mb-3 text-sm font-extrabold tracking-[-0.02em] text-text-1 sm:text-[17px]">
            진행 중인 매물
          </h2>
          {/* 좌우 14px 지면에 2열. 카드는 홈·목록·검색과 같은 compact 리듬을 쓴다. */}
          <AuctionGrid
            auctions={auctions?.content ?? []}
            variant="compact"
            gridClassName="grid grid-cols-2 gap-x-2 gap-y-[18px] sm:grid-cols-4 sm:gap-x-4"
          />
        </section>
      </div>
    </>
  );
}
