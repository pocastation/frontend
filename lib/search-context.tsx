"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// 참고 디자인은 검색창이 헤더에 있고 입력 즉시 결과 섹션으로 스크롤한다(SPA라 페이지 이동이 없음).
// 우리는 페이지가 분리돼 있어 URL 쿼리로 매 키입력마다 서버를 왕복하는 대신, 헤더 입력과 홈
// 화면의 필터링이 같은 값을 보게 Context로 공유한다(레이아웃에 상주해 페이지 이동에도 유지됨).
type SearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return <SearchContext.Provider value={{ query, setQuery }}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return ctx;
}
