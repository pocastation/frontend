"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ArtistRow from "@/components/ArtistRow";
import { ExploreEmpty, ExploreError, InlineSpinner } from "@/components/explore-states";
import { apiFetch } from "@/lib/api";
import { ARTIST_TYPE_LABEL, ARTIST_TYPE_OPTIONS } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ArtistListResponse, ArtistResponse, ArtistType } from "@/lib/types";

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 300;
// 줄 목록(#499). 모바일은 한 열, 데스크탑은 두 열로 흘린다 — 1160px에 한 줄씩 두면 줄이
// 지나치게 길어지고, 카드 격자로 되돌리면 이미지 없는 스타가 대부분이라 화면이 비어 보인다.
// column-gap이 큰 이유는 두 열 사이에 세로선이 없어서다(헤어라인은 각 줄의 아래에만 있다).
const LIST_CLASS = "grid grid-cols-1 sm:grid-cols-2 sm:gap-x-12";

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
  // 빠른 연속 검색/필터 시 옛 응답이 최신 결과를 덮어쓰는 걸 막는 요청 시퀀스 가드.
  const reqIdRef = useRef(0);

  // 검색어·타입 필터가 바뀌면 첫 페이지부터 다시 조회(목록 전체 교체).
  const fetchFirstPage = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch<ArtistListResponse>(`/api/artists?${buildParams(query, type, 0)}`, {
        cache: "no-store",
      });
      if (reqId !== reqIdRef.current) return; // 더 최신 요청에 밀렸으면 무시
      setArtists(res.content);
      setPage(0);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setError(true);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
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
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-2.5">
        <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-full border border-border-2 px-3.5 focus-within:border-text-1 sm:h-[42px] sm:px-4">
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

        {/* 선택된 칩은 잉크(text-1)로 채운다 — 거래 목록·검색 화면의 칩과 같은 관례다.
            보라(primary)는 CTA·필수 표시·포커스처럼 «행동을 요구하는» 자리에만 쓴다. */}
        <div className="flex shrink-0 gap-1.5" role="group" aria-label="스타 타입 필터">
          <button
            type="button"
            aria-pressed={type === null}
            onClick={() => setType(null)}
            className={`min-h-9 rounded-full border px-3.5 text-[12.5px] font-bold transition-colors sm:h-[42px] sm:px-4 sm:text-[13px] ${FOCUS_RING} ${
              type === null ? "border-text-1 bg-text-1 text-white" : "border-border-2 bg-white text-text-2"
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
              className={`min-h-9 rounded-full border px-3.5 text-[12.5px] font-bold transition-colors sm:h-[42px] sm:px-4 sm:text-[13px] ${FOCUS_RING} ${
                type === option ? "border-text-1 bg-text-1 text-white" : "border-border-2 bg-white text-text-2"
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
          <ExploreError title="스타를 불러오지 못했어요" onRetry={fetchFirstPage} />
        </div>
      )}

      {artists.length > 0 ? (
        // 재검색·필터 변경 중에도 기존 카드를 유지하고 dim만 준다(스켈레톤으로 통째 교체 X).
        <div className={`${LIST_CLASS} transition-opacity ${loading ? "opacity-60" : error ? "opacity-45" : ""}`}>
          {artists.map((artist) => (
            <ArtistRow key={artist.id} artist={artist} />
          ))}
        </div>
      ) : error ? null : (
        // 빈 목록도 로딩 중 높이가 다른 스피너로 교체하지 않고 dim만(레이아웃 시프트 방지).
        <div className={loading ? "opacity-60 transition-opacity" : undefined}>
          <ExploreEmpty
            title={filtered ? "조건에 맞는 스타가 없어요" : "등록된 스타가 없습니다"}
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
            className={`flex h-11 items-center gap-2 rounded-full border border-border-2 bg-white px-6 text-[13.5px] font-bold text-text-1 transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
          >
            {loadingMore ? "불러오는 중..." : moreError ? "다시 시도" : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
