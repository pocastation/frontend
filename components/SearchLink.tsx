"use client";

import { useRouter } from "next/navigation";
import { useSearch } from "@/lib/search-context";

type Props = {
  query: string;
  className?: string;
  children: React.ReactNode;
};

// 아티스트 해시태그 칩·"다른 경매 보기" 링크가 공유하는 동작 — 기존 헤더 검색과 같은 방식으로
// SearchProvider 쿼리를 채우고 홈으로 이동한다(검색은 홈에서만 의미 있음). 판매자별 목록 API는
// 아직 없어서, 백엔드 없이도 바로 되는 "아티스트명 텍스트 검색"을 재사용한다.
export default function SearchLink({ query, className, children }: Props) {
  const router = useRouter();
  const { setQuery } = useSearch();

  return (
    <button
      type="button"
      onClick={() => {
        setQuery(query);
        router.push("/");
      }}
      className={className}
    >
      {children}
    </button>
  );
}
