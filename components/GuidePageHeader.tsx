import type { ReactNode } from "react";

/**
 * 가이드 문서 페이지의 상단 머리말.
 *
 * 이전에는 딥스페이스 배경 + 별 장식이 깔린 히어로였다. 히어로는 방문자를 붙잡아야 하는
 * 랜딩에서 값을 하지, **읽으러 들어온 문서**에서는 첫 화면을 장식으로 채워 본문을 밀어낼 뿐이다.
 * 제목 · 리드 · 메타 한 줄로 줄이고, 남은 자리는 본문에 준다.
 *
 * 좌측 정렬이다 — 중앙 정렬 제목은 읽는 문서가 아니라 광고 배너로 읽힌다.
 */
export default function GuidePageHeader({
  kicker,
  title,
  lead,
  meta,
  children,
}: {
  kicker: string;
  // 줄바꿈 위치를 페이지가 정할 수 있게 노드로 받는다 — 제목이 어디서 꺾이는지는 조판의 문제다.
  title: ReactNode;
  lead: string;
  // 분량·규칙처럼 읽기 전에 알면 좋은 사실. 강조가 아니라 각주 톤이다.
  meta?: string;
  children?: ReactNode;
}) {
  return (
    <header>
      <p className="text-[12px] font-bold text-text-3">{kicker}</p>
      <h1 className="mt-2 font-display text-[27px] font-extrabold leading-[1.18] tracking-[-0.035em] text-text-1 sm:text-[34px]">
        {title}
      </h1>
      <p className="mt-3.5 max-w-[34rem] text-[13.5px] leading-[1.75] text-text-2">{lead}</p>
      {meta && <p className="mt-3 text-[12px] text-text-3">{meta}</p>}
      {children}
    </header>
  );
}
