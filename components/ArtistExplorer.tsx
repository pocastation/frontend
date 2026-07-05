"use client";

import { useEffect, useRef, useState } from "react";
import ArtistCard from "@/components/ArtistCard";
import { apiFetch } from "@/lib/api";
import { ARTIST_TYPE_LABEL, ARTIST_TYPE_OPTIONS } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ArtistListResponse, ArtistResponse, ArtistType } from "@/lib/types";

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 300;

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
  const isFirstRun = useRef(true);

  // 검색어·타입 필터가 바뀌면 첫 페이지부터 다시 조회(목록 전체 교체).
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch<ArtistListResponse>(`/api/artists?${buildParams(query, type, 0)}`, {
          cache: "no-store",
        });
        setArtists(res.content);
        setPage(0);
        setTotalElements(res.totalElements);
        setTotalPages(res.totalPages);
      } catch {
        // 검색 실패는 조용히 무시하고 직전 결과를 유지한다.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, type]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await apiFetch<ArtistListResponse>(`/api/artists?${buildParams(query, type, nextPage)}`, {
        cache: "no-store",
      });
      setArtists((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch {
      // 더보기 실패는 조용히 무시 — 이미 보이는 목록은 유지.
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = page + 1 < totalPages;

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

      <p className="mb-3 text-xs text-text-3">
        {totalElements}개{loading && " · 검색 중..."}
      </p>

      {artists.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <p className="text-sm text-text-3">{query ? "검색 결과가 없습니다." : "등록된 아티스트가 없습니다."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={`flex h-11 items-center gap-2 rounded-full border border-border-2 bg-white px-6 text-[13.5px] font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
          >
            {loadingMore ? "불러오는 중..." : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
