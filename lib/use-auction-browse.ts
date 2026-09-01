"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useWishlistStatus } from "@/lib/use-wishlist-status";
import type { SortKey } from "@/components/AuctionExplorer";
import type { AuctionListResponse, AuctionResponse, AuctionSaleType } from "@/lib/types";

/**
 * 목록 화면의 조회·검색·정렬·더보기 상태.
 *
 * <p>데스크탑(`AuctionBrowser`)과 모바일(`MobileBrowse`)은 **화면 구성이 다르지만 하는 일은 같다.**
 * 요청 시퀀스 가드·디바운스·페이지 누적처럼 틀리기 쉬운 부분을 두 곳에 따로 두면 언젠가 한쪽만
 * 고쳐진다 — 로직은 여기 한 벌이고, 화면은 그 결과를 그리기만 한다.
 */

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

/**
 * 목록의 판매 유형. `"ALL"`은 제안·즉시를 함께 본다(BE #418) — 검색 화면이 쓴다.
 *
 * ⚠️ 도메인 타입(`AuctionSaleType`)이 아니라 **조회 조건**이다. 서버도 같은 이유로 도메인
 * enum에 넣지 않고 `SaleTypeFilter`를 따로 뒀다.
 */
export type SaleTypeFilter = AuctionSaleType | "ALL";

// 종료 목록 엔드포인트(/api/auctions/ended)는 saleType 파라미터를 받지 않으므로(항상 AUCTION),
// 진행중 목록일 때만 saleType을 붙인다.
function buildParams(
  query: string,
  sort: SortKey,
  page: number,
  saleType: SaleTypeFilter,
  includeSaleType: boolean,
) {
  const params = new URLSearchParams({ sort, size: String(PAGE_SIZE), page: String(page) });
  if (includeSaleType) params.set("saleType", saleType);
  if (query.trim()) params.set("q", query.trim());
  return params;
}

export type AuctionBrowseState = ReturnType<typeof useAuctionBrowse>;

export function useAuctionBrowse({
  initialAuctions,
  initialTotalElements,
  initialTotalPages,
  saleType = "AUCTION",
  initialQuery = "",
  endpoint = "/api/auctions",
  defaultSort = "latest",
  minQueryLength = 0,
}: {
  initialAuctions: AuctionResponse[];
  initialTotalElements: number;
  initialTotalPages: number;
  saleType?: SaleTypeFilter;
  initialQuery?: string;
  endpoint?: string;
  defaultSort?: SortKey;
  /**
   * 이 길이 미만의 검색어로는 조회하지 않는다(#493). 목록 화면은 기본값 0이라 지금까지와 같다.
   *
   * <p>검색 화면만 2를 쓴다 — 한 글자는 사실상 전체 조회라 결과가 수백 건 나오고, 그 요청이
   * 타이핑 첫 글자마다 날아간다. **빈 검색어는 이 제한을 받지 않는다**(목록 화면의 「전체 보기」).
   */
  minQueryLength?: number;
}) {
  const includeSaleType = endpoint === "/api/auctions";
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>(defaultSort);
  const [auctions, setAuctions] = useState(initialAuctions);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(initialTotalElements);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const isFirstRun = useRef(true);
  // 빠른 연속 정렬/검색 시 옛 응답이 최신 결과를 덮어쓰는 걸 막는 요청 시퀀스 가드.
  const reqIdRef = useRef(0);
  const { wishlisted, toggle } = useWishlistStatus(auctions.map((a) => a.id));

  // 검색어·정렬이 바뀌면 첫 페이지부터 다시 조회(목록 전체 교체).
  const fetchFirstPage = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch<AuctionListResponse>(
        `${endpoint}?${buildParams(query, sort, 0, saleType, includeSaleType)}`,
        { cache: "no-store" },
      );
      if (reqId !== reqIdRef.current) return; // 더 최신 요청에 밀렸으면 무시
      setAuctions(res.content);
      setPage(0);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setError(true);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [query, saleType, sort, endpoint, includeSaleType]);

  useEffect(() => {
    // 첫 렌더는 서버가 이미 같은 조건으로 SSR해 온 결과라 재요청하지 않는다.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    // 너무 짧은 검색어로는 서버를 부르지 않는다(#493). 빈 검색어는 「전체 보기」라 제한 밖이다.
    const trimmed = query.trim();
    if (trimmed.length > 0 && trimmed.length < minQueryLength) return;
    const timer = setTimeout(fetchFirstPage, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fetchFirstPage, query, minQueryLength]);

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const res = await apiFetch<AuctionListResponse>(
        `${endpoint}?${buildParams(query, sort, nextPage, saleType, includeSaleType)}`,
        { cache: "no-store" },
      );
      setAuctions((prev) => [...prev, ...res.content]);
      setPage(nextPage);
      setTotalPages(res.totalPages);
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [endpoint, includeSaleType, page, query, saleType, sort]);

  return {
    query,
    setQuery,
    sort,
    setSort,
    auctions,
    totalElements,
    loading,
    loadingMore,
    error,
    moreError,
    hasMore: page + 1 < totalPages,
    loadMore,
    retry: fetchFirstPage,
    wishlisted,
    toggle,
  };
}
