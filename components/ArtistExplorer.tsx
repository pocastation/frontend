"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ArtistCard from "@/components/ArtistCard";
import { CardSkeletonGrid, ExploreEmpty, ExploreError, InlineSpinner } from "@/components/explore-states";
import { apiFetch } from "@/lib/api";
import { ARTIST_TYPE_LABEL, ARTIST_TYPE_OPTIONS } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ArtistListResponse, ArtistResponse, ArtistType } from "@/lib/types";

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 300;
const GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5";

function buildParams(query: string, type: ArtistType | null, page: number) {
  const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(page) });
  if (query.trim()) params.set("q", query.trim());
  if (type) params.set("type", type);
  return params;
}

// 홈 화면의 AuctionExplorer와 같은 이유로, 첫 화면은 서버컴포넌트(page.tsx)가 이미 SSR한
// 결과를 그대로 쓰고 이후 검색어·타입 필터 변경만 클라이언트에서 재요청한다.
export default function ArtistExplorer({
  initialArtists,
  initialTotalElements,
  initialTotalPages,
}: {
  initialArtists: ArtistResponse[];
  initialTotalElements: number;
  initialTotalPages: number;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ArtistType | null>(null);
  const [artists, setArtists] = useState(initialArtists);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(initialTotalElements);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const isFirstRun = useRef(true);

  // 검색어·타입 필터가 바뀌면 첫 페이지부터 다시 조회(목록 전체 교체).
  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch<ArtistListResponse>(`/api/artists?${buildParams(query, type, 0)}`, {
        cache: "no-store",
      });
      setArtists(res.content);
      setPage(0);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [query, type]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const timer = setTimeout(fetchFirstPage, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fetchFirstPage]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const res = await apiFetch<ArtistListResponse>(`/api/artists?${buildParams(query, type, nextPage)}`, {
        cache: "no-store",
      });
      setArtists((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = page + 1 < totalPages;
  const filtered = query.trim() !== "" || type !== null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <label className="flex h-[42px] min-w-[240px] flex-1 items-center gap-2 rounded-full border border-border px-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-3" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="sr-only">그룹명 또는 영문명 검색</span>
          <input
            type="search"
            placeholder="그룹명 또는 영문명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border-0 bg-transparent text-[13.5px] text-text-1 outline-none placeholder:text-text-3"
          />
        </label>

        <div className="flex shrink-0 gap-1.5" role="group" aria-label="아티스트 타입 필터">
          <button
            type="button"
            aria-pressed={type === null}
            onClick={() => setType(null)}
            className={`h-[42px] rounded-full border px-4 text-[13px] font-bold transition-colors ${FOCUS_RING} ${
              type === null ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:border-primary hover:text-primary"
            }`}
          >
            전체
          </button>
          {ARTIST_TYPE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={type === option}
              onClick={() => setType(option)}
              className={`h-[42px] rounded-full border px-4 text-[13px] font-bold transition-colors ${FOCUS_RING} ${
                type === option ? "border-primary bg-primary text-white" : "border-border text-text-2 hover:border-primary hover:text-primary"
              }`}
            >
              {ARTIST_TYPE_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 flex items-center gap-2 text-xs text-text-3">
        <span>{totalElements}개</span>
        {loading && <InlineSpinner />}
      </p>

      {error && (
        <div className="mb-4">
          <ExploreError title="아티스트를 불러오지 못했어요" onRetry={fetchFirstPage} />
        </div>
      )}

      {loading ? (
        <div className={GRID_CLASS}>
          <CardSkeletonGrid count={12} variant="artist" />
        </div>
      ) : artists.length === 0 ? (
        error ? null : (
          <ExploreEmpty
            title={filtered ? "조건에 맞는 아티스트가 없어요" : "등록된 아티스트가 없습니다"}
            hint={filtered ? "다른 키워드로 검색하거나 필터를 바꿔보세요." : undefined}
            onClear={
              filtered
                ? () => {
                    setQuery("");
                    setType(null);
                  }
                : undefined
            }
            clearLabel="필터 초기화"
          />
        )
      ) : (
        <div className={`${GRID_CLASS} ${error ? "opacity-45" : ""}`}>
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-8 flex flex-col items-center gap-2">
          {moreError && (
            <p className="text-xs font-semibold text-accent">더 불러오지 못했어요. 다시 시도해 주세요.</p>
          )}
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={`flex h-11 items-center gap-2 rounded-full border border-border-2 bg-white px-6 text-[13.5px] font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
          >
            {loadingMore ? "불러오는 중..." : moreError ? "다시 시도" : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
