import Link from "next/link";

type Props = {
  query: string;
  className?: string;
  children: React.ReactNode;
};

// 아티스트 해시태그 칩·"다른 매물 보기" 링크 — 매물 목록(/auctions)을 그 검색어로 연다.
// 판매자별 목록 API는 아직 없어서 "아티스트명 텍스트 검색"을 재사용한다.
export default function SearchLink({ query, className, children }: Props) {
  return (
    <Link href={`/auctions?q=${encodeURIComponent(query)}`} className={className}>
      {children}
    </Link>
  );
}
