"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuctionCard from "@/components/AuctionCard";
import { CardSkeletonGrid, ExploreEmpty, ExploreError, InlineSpinner } from "@/components/explore-states";
import { apiFetch } from "@/lib/api";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  removeRecentSearch,
  subscribeRecentSearches,
} from "@/lib/recent-searches";
import { FOCUS_RING } from "@/lib/ui";
import { useAuctionBrowse, type SaleTypeFilter } from "@/lib/use-auction-browse";
import type { ArtistListResponse, ArtistResponse, AuctionResponse } from "@/lib/types";

/**
 * 검색 전용 화면(#493).
 *
 * <p><b>골격은 「스타 칩 줄 + 매물 그리드」다</b>(시안 C안). 검색은 아티스트·멤버 이름으로 매물을
 * 거르는 구조라 「어느 스타를 말하는지」가 갈릴 때가 있다 — 「아이」는 아이브·아이들·아이유에
 * 모두 걸린다. 그 질문을 삼키면(매물만 쏟으면) 결과가 섞여 읽히고, 항상 물으면(스타를 먼저
 * 고르게 하면) 후보가 하나뿐일 때도 한 번 더 누르게 된다. <b>후보가 둘 이상일 때만 칩 줄을
 * 띄운다</b> — 물어야 할 때만 묻는다.
 *
 * <p>매물 카드·찜·가격 포맷은 <b>기존 컴포넌트를 그대로</b> 쓴다. 여기서 새로 두는 것은 배치뿐이다.
 */

const SALE_TYPE_TABS: { key: SaleTypeFilter; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "AUCTION", label: "제안판매" },
  { key: "INSTANT", label: "즉시판매" },
];

/** 검색어가 이보다 짧으면 서버를 부르지 않는다. 한 글자는 사실상 전체 조회다. */
const MIN_QUERY_LENGTH = 2;

/** 칩 줄에 올리는 스타 수. 넘치면 가로로 흐른다. */
const MAX_ARTIST_CHIPS = 12;

function SearchIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

/** 이름 앞 두 글자. 이미지가 없는 스타가 대부분이라 원형 자리를 비워 두지 않기 위한 것. */
function initials(name: string) {
  return name.replace(/[()\s]/g, "").slice(0, 2);
}

function Avatar({ artist, size }: { artist: ArtistResponse; size: number }) {
  const px = { width: size, height: size };
  if (artist.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- 외부 CDN 절대 URL이라 next/image 도메인 설정 밖이다(기존 카드 썸네일과 같은 처리).
    return <img src={artist.imageUrl} alt="" style={px} className="shrink-0 rounded-full object-cover" loading="lazy" />;
  }
  return (
    <span
      style={px}
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-surface-2 font-display font-extrabold text-text-3"
    >
      <span style={{ fontSize: Math.round(size * 0.27) }}>{initials(artist.name)}</span>
    </span>
  );
}

export default function SearchScreen({
  initialQuery,
  initialAuctions,
  initialTotalElements,
  initialTotalPages,
  initialMatchedArtists,
  popularArtists,
}: {
  initialQuery: string;
  initialAuctions: AuctionResponse[];
  initialTotalElements: number;
  initialTotalPages: number;
  initialMatchedArtists: ArtistResponse[];
  popularArtists: ArtistResponse[];
}) {
  const router = useRouter();
  const [saleType, setSaleType] = useState<SaleTypeFilter>("ALL");
  const {
    query,
    setQuery,
    auctions,
    totalElements,
    loading,
    loadingMore,
    error,
    moreError,
    hasMore,
    loadMore,
    retry,
    wishlisted,
    toggle,
  } = useAuctionBrowse({
    initialAuctions,
    initialTotalElements,
    initialTotalPages,
    initialQuery,
    saleType,
    defaultSort: "recommended",
    minQueryLength: MIN_QUERY_LENGTH,
  });

  // 사용자가 **직접 친** 검색어. 스타 칩을 눌러 좁힌 뒤 「전체」로 돌아올 자리다.
  const [baseQuery, setBaseQuery] = useState(initialQuery);
  const [matchedArtists, setMatchedArtists] = useState(initialMatchedArtists);
  const inputRef = useRef<HTMLInputElement>(null);
  const artistReqRef = useRef(0);

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;
  const tooShort = hasQuery && trimmed.length < MIN_QUERY_LENGTH;

  // localStorage는 React 밖의 저장소라 구독해서 읽는다. 서버 스냅샷은 항상 null이라
  // 초기 렌더가 비어 있고, 하이드레이션 뒤 값이 차도 어긋나지 않는다.
  const recentRaw = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot,
  );
  const recent = useMemo(() => {
    if (!recentRaw) return [];
    try {
      const parsed: unknown = JSON.parse(recentRaw);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }, [recentRaw]);

  // 돋보기로 들어온 사람은 곧바로 칠 수 있어야 한다. 이 화면이 존재하는 이유의 절반이다.
  useEffect(() => {
    if (!initialQuery) inputRef.current?.focus();
  }, [initialQuery]);

  // 매칭 스타 조회. 매물 쪽 훅과 **같은 검색어를 따로 부른다** — 서버가 한 번에 주지 않기 때문이고,
  // 응답이 뒤바뀌어 도착할 수 있어 여기도 시퀀스 가드를 둔다(목록 훅과 같은 이유).
  useEffect(() => {
    // 너무 짧으면 부르지 않는다. 여기서 상태를 비우지 않는 이유는 아래 `artistChips`가
    // 렌더에서 이미 걸러 주기 때문이다 — 이펙트에서 setState를 하면 렌더가 한 번 더 돈다.
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    const reqId = ++artistReqRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<ArtistListResponse>(
          `/api/artists?q=${encodeURIComponent(trimmed)}&size=${MAX_ARTIST_CHIPS}`,
          { cache: "no-store" },
        );
        if (reqId !== artistReqRef.current) return;
        setMatchedArtists(res.content);
      } catch {
        if (reqId !== artistReqRef.current) return;
        // 스타 칩은 보조 정보다. 못 가져와도 매물 결과는 그대로 보여준다.
        setMatchedArtists([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const submit = useCallback(
    (value: string) => {
      const next = value.trim();
      setBaseQuery(next);
      setQuery(next);
      if (next.length >= MIN_QUERY_LENGTH) addRecentSearch(next);
      inputRef.current?.blur();
    },
    [setQuery],
  );

  function handleChange(value: string) {
    setBaseQuery(value);
    setQuery(value);
  }

  // 칩으로 좁힐 때는 baseQuery를 건드리지 않는다 — 「전체」로 돌아올 자리를 지켜야 한다.
  function narrowTo(name: string) {
    setQuery(name);
  }

  const narrowed = trimmed !== baseQuery.trim();
  // 검색어가 짧아지면(지우는 중) 직전 결과가 남아 있으므로 렌더에서 걸러 낸다.
  const artistChips = trimmed.length < MIN_QUERY_LENGTH ? [] : matchedArtists;
  // 후보가 하나뿐이면 물을 것이 없다 — 칩 줄을 통째로 감춘다.
  const showArtistChips = artistChips.length > 1 || (narrowed && artistChips.length > 0);

  const field = (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit(query);
      }}
      className="flex h-9 flex-1 items-center gap-2 rounded-full border border-border-2 px-3.5 text-text-3 focus-within:border-text-1"
    >
      <SearchIcon />
      <label htmlFor="search-field" className="sr-only">
        스타·멤버·앨범 검색
      </label>
      <input
        id="search-field"
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="스타, 멤버, 앨범 검색"
        autoComplete="off"
        className="w-full border-0 bg-transparent text-[13.5px] text-text-1 outline-none placeholder:text-text-3"
      />
      {hasQuery && (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => {
            handleChange("");
            inputRef.current?.focus();
          }}
          className={`shrink-0 rounded-full text-text-3 hover:text-text-1 ${FOCUS_RING}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
        </button>
      )}
    </form>
  );

  return (
    <>
      {/*
        앱바 — 제목을 두지 않는다(입력이 곧 제목이다).

        ⚠️ 입력은 **DOM에 하나뿐이어야 한다.** 모바일용·데스크탑용으로 두 벌 렌더하면 같은 id와
        같은 ref가 문서에 둘 생겨 label 연결이 모호해지고, 포커스가 화면에 보이지 않는 쪽으로
        간다. 그래서 트리는 한 벌이고 **셸만 반응형으로** 바뀐다 — 모바일은 sticky 앱바,
        데스크탑은 전역 헤더 아래 놓이는 평범한 블록(뒤로 버튼은 감춘다).
      */}
      <header className="sticky top-0 z-[300] border-b border-border bg-white sm:static sm:mx-auto sm:w-full sm:max-w-[720px] sm:border-0 sm:px-4 sm:pt-8">
        <div className="flex h-12 items-center gap-1 pl-1 pr-[14px] sm:h-auto sm:p-0">
          <button
            type="button"
            aria-label="뒤로"
            onClick={() => router.back()}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-1 transition-colors hover:bg-surface-2 sm:hidden ${FOCUS_RING}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          {field}
        </div>
      </header>

      <div className="mx-auto w-full max-w-[720px] pb-16 sm:px-4 sm:pt-6">
        {!hasQuery ? (
          <>
            {recent.length > 0 && (
              <>
                <section className="px-[14px] sm:px-0">
                  <div className="flex items-center justify-between pt-3.5 sm:pt-0">
                    <h2 className="text-sm font-extrabold tracking-[-0.02em] text-text-1">최근 검색어</h2>
                    <button
                      type="button"
                      onClick={() => clearRecentSearches()}
                      className={`rounded-r1 text-[11.5px] font-semibold text-text-3 hover:text-text-1 ${FOCUS_RING}`}
                    >
                      전체 삭제
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2.5">
                    {recent.map((item) => (
                      <span
                        key={item}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-2 pl-3 pr-2 text-[12.5px] font-bold text-text-2"
                      >
                        <button
                          type="button"
                          onClick={() => submit(item)}
                          className={`rounded-r1 hover:text-text-1 ${FOCUS_RING}`}
                        >
                          {item}
                        </button>
                        <button
                          type="button"
                          aria-label={`${item} 검색 기록 삭제`}
                          onClick={() => removeRecentSearch(item)}
                          className={`rounded-full text-text-3 hover:text-text-1 ${FOCUS_RING}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </section>
                <div aria-hidden="true" className="mt-4 h-2 bg-surface-2 sm:hidden" />
              </>
            )}

            <section className="px-[14px] sm:mt-8 sm:px-0">
              <div className="flex items-center justify-between pt-3.5 sm:pt-0">
                <h2 className="text-sm font-extrabold tracking-[-0.02em] text-text-1">인기 스타</h2>
                <Link href="/artists" className={`rounded-r1 text-[11.5px] font-semibold text-text-3 hover:text-text-1 ${FOCUS_RING}`}>
                  더보기
                </Link>
              </div>
              {popularArtists.length === 0 ? (
                <p className="py-8 text-center text-[12.5px] text-text-3">불러올 스타가 없어요.</p>
              ) : (
                <ul className="grid grid-cols-4 gap-x-3 gap-y-4 pt-3 sm:grid-cols-6">
                  {popularArtists.map((artist) => (
                    <li key={artist.id}>
                      <button
                        type="button"
                        onClick={() => submit(artist.name)}
                        className={`flex w-full flex-col items-center rounded-r2 ${FOCUS_RING}`}
                      >
                        <Avatar artist={artist} size={56} />
                        <span className="mt-1.5 w-full truncate text-center text-[11px] font-bold text-text-2">
                          {artist.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <div className="px-[14px] sm:px-0">
            {showArtistChips && (
              <div className="flex gap-1.5 overflow-x-auto pt-3 pb-0.5" role="group" aria-label="스타로 좁히기">
                <button
                  type="button"
                  aria-pressed={!narrowed}
                  onClick={() => setQuery(baseQuery)}
                  className={`inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[12.5px] font-bold transition-colors ${FOCUS_RING} ${
                    narrowed ? "border-border-2 bg-white text-text-2" : "border-text-1 bg-text-1 text-white"
                  }`}
                >
                  전체
                </button>
                {artistChips.map((artist) => {
                  const on = trimmed === artist.name;
                  return (
                    <button
                      key={artist.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => narrowTo(artist.name)}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border py-0 pl-1 pr-3 text-[12px] font-bold transition-colors ${FOCUS_RING} ${
                        on ? "border-text-1 bg-text-1 text-white" : "border-border-2 bg-white text-text-2"
                      }`}
                    >
                      <Avatar artist={artist} size={24} />
                      {artist.name}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-1.5 pt-2.5" role="group" aria-label="판매 유형">
              {SALE_TYPE_TABS.map((tab) => {
                const on = saleType === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSaleType(tab.key)}
                    className={`min-h-8 shrink-0 rounded-full border px-3.5 text-[12.5px] font-bold transition-colors ${FOCUS_RING} ${
                      on ? "border-text-1 bg-text-1 text-white" : "border-border-2 bg-white text-text-2"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {tooShort ? (
              <p className="py-10 text-center text-[12.5px] text-text-3">두 글자 이상 입력해 주세요.</p>
            ) : error ? (
              <div className="pt-6">
                <ExploreError onRetry={retry} />
              </div>
            ) : loading ? (
              <div className="grid grid-cols-2 gap-x-2 gap-y-[18px] pt-3 sm:grid-cols-3">
                <CardSkeletonGrid count={4} variant="auction" />
              </div>
            ) : auctions.length === 0 ? (
              <div className="pt-6">
                <ExploreEmpty
                  title={`"${trimmed}" 검색 결과가 없어요`}
                  hint="다른 키워드로 검색하거나 유형을 바꿔보세요."
                  onClear={() => handleChange("")}
                />
              </div>
            ) : (
              <>
                <p className="pt-3 text-[11.5px] tabular-nums text-text-3">
                  매물 <b className="font-bold text-text-2">{totalElements.toLocaleString()}</b>
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-[18px] pt-2.5 sm:grid-cols-3">
                  {auctions.map((auction) => (
                    <AuctionCard
                      key={auction.id}
                      auction={auction}
                      variant="compact"
                      wishlisted={wishlisted.has(auction.id)}
                      onToggleWishlist={(next) => toggle(auction.id, next)}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="pt-6 text-center">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className={`min-h-10 rounded-r2 border border-border-2 px-5 text-[13px] font-bold text-text-1 disabled:text-text-3 ${FOCUS_RING}`}
                    >
                      {loadingMore ? <InlineSpinner /> : "더보기"}
                    </button>
                    {moreError && <p className="pt-2 text-[11.5px] text-accent">더 불러오지 못했어요. 다시 눌러 주세요.</p>}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
