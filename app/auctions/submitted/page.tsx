"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";

/**
 * 검수 대기로 등록된 직후 안내 화면. 자동 승인이면 여기 오지 않고 곧바로 매물 상세로 간다
 * (목적지는 등록 API가 돌려준 status로 정한다 — app/auctions/new/page.tsx).
 *
 * <p>🔴 리디자인(#459, 시안 승인 2026-08-31). 예전 화면은 금지 패턴 셋이 겹쳐 있었다 —
 * 전체를 감싼 카드, 원형 체크 아이콘, 연보라(primary-soft) 배경. 데스크탑은 그 카드가
 * 그대로 확대돼 빈 화면 가운데 떴다.
 *
 * <p>카드를 걷고 <b>규칙선 + 번호 축 타임라인</b>으로 짠다. 이 화면이 답해야 할 질문은
 * 「접수됐다」가 아니라 <b>「전체 여정(접수→검수→게시)에서 지금 어디인가」</b>다 — 번호가
 * 장식이 아니라 실제 순서라 numbering이 성립한다. 상태는 도트 없이 텍스트의 색·굵기로만
 * 말한다(「진행 중」만 warn색). 데스크탑(sm:)에서는 타임라인이 가로 3칸으로 눕는다.
 *
 * <p>🔴 흐름 정리(#515). 본문 골격은 위 그대로 두고 <b>화면을 감싼 것들</b>만 고쳤다.
 * <ul>
 *   <li>이 경로가 {@code MOBILE_FULLSCREEN_ROUTES}에 없어 <b>여기서만 전역 헤더 58px이
 *       되살아났다</b> — 위저드는 X로 닫는 풀스크린인데 마지막 장만 데스크탑 크롬이었다.
 *       라우트를 등록하고 48px 앱바 + 닫기로 바꿨다.</li>
 *   <li><b>10초 자동 이동을 걷었다.</b> {@code router.replace("/")}였다 — 뒤로 가기로 돌아올
 *       수도 없이, 접수번호를 읽는 중에 화면을 뺏었다. 이 화면이 스스로 사라져야 할 이유가
 *       없다(나갈 길이 이미 셋이다).</li>
 *   <li><b>접수번호를 꼬리표에서 헤어라인 행으로 올렸다.</b> 문의할 때 필요한 유일한
 *       식별자인데 사라지는 문장 뒤에 붙어 있었다.</li>
 * </ul>
 * 푸터는 그대로 둔다 — 전상법 §10 표시사항이라 전 화면에 뜬다(#399).
 */

// 단계 정의 — 이 화면에서 사용자는 항상 02(검수)에 있다. 상태별 문구·톤을 데이터로 둔다.
const STEPS: { no: string; title: string; note: string; state: "done" | "current" | "todo" }[] = [
  { no: "01", title: "등록 접수", note: "방금 완료", state: "done" },
  { no: "02", title: "관리자 검수", note: "진행 중", state: "current" },
  { no: "03", title: "게시 시작", note: "승인되면 알림으로", state: "todo" },
];

export default function AuctionSubmittedPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">불러오는 중...</div>}>
      <AuctionSubmittedContent />
    </Suspense>
  );
}

function AuctionSubmittedContent() {
  const searchParams = useSearchParams();
  const auctionId = searchParams.get("id");

  return (
    <>
      {/*
        뒤로가 아니라 **닫기**다. 폼은 이미 제출됐고, 뒤로 가면 방금 보낸 위저드로 돌아간다.
        닫고 갈 곳은 홈 — 위저드 머리의 X와 같은 목적지라 흐름 내내 같은 동작이 된다.
      */}
      <MobilePageHead title="등록 완료" variant="close" backHref="/" />

      {/* 레이아웃이 이미 <main>으로 감싼다 — 여기서 또 쓰면 main이 중첩된다(#515에서 발견). */}
      <div className="mx-auto w-full max-w-[560px] px-[14px] py-9 sm:px-5 sm:py-20">
        <span aria-hidden="true" className="block h-[3px] w-7 bg-primary" />
        <p className="mt-4 text-[11.5px] font-bold tracking-[0.08em] text-text-3">판매 등록</p>
        <h1 className="mt-2 font-display text-[24px] font-extrabold leading-[1.25] tracking-[-0.03em] text-text-1 sm:text-[26px]">
          등록 신청이 접수됐어요
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-text-2">
          관리자가 소유 인증을 확인한 뒤 게시돼요. 보통{" "}
          <strong className="font-bold text-text-1">1영업일 이내</strong>에 끝나요.
        </p>

        {/* 단계 타임라인 — 모바일은 세로 행, 데스크탑은 가로 3칸. 같은 데이터가 다시 앉을 뿐이다. */}
        <ol className="mt-7 border-t border-border sm:grid sm:grid-cols-3 sm:gap-4 sm:pt-4">
          {STEPS.map((step) => (
            <li
              key={step.no}
              className="flex items-baseline gap-2.5 border-b border-border py-3 sm:block sm:border-b-0 sm:border-l sm:border-border sm:py-0 sm:pl-3.5 sm:first:border-l-0 sm:first:pl-0"
            >
              <span
                aria-hidden="true"
                className="font-display text-[10.5px] font-bold tabular-nums text-text-3"
              >
                {step.no}
              </span>
              <span
                className={`flex-1 text-[13px] sm:mt-0.5 sm:block ${
                  step.state === "todo" ? "font-bold text-text-2" : "font-extrabold text-text-1"
                }`}
              >
                {step.title}
              </span>
              <span
                className={`text-[11.5px] sm:mt-px sm:block ${
                  step.state === "current" ? "font-bold text-warn" : "text-text-3"
                }`}
              >
                {step.note}
              </span>
            </li>
          ))}
        </ol>

        {/*
          접수번호 — 문의할 때 대는 유일한 식별자다. 카드로 감싸지 않고 헤어라인 한 행으로 둔다
          (타임라인과 같은 선을 쓰되 위아래를 다 닫아 값 하나짜리 행임을 구분한다).
        */}
        {auctionId && (
          <div className="mt-6 flex items-baseline justify-between border-y border-border py-3">
            <span className="text-[11.5px] font-bold tracking-[0.04em] text-text-3">접수번호</span>
            <span className="font-display text-[15px] font-extrabold tabular-nums text-text-1">#{auctionId}</span>
          </div>
        )}

        <div className="mt-7 flex gap-2">
          <Link
            href="/mypage?tab=selling"
            className={`inline-flex h-12 flex-1 items-center justify-center px-5 sm:max-w-[180px] ${PRIMARY_BUTTON_CLASS}`}
          >
            판매 내역 보기
          </Link>
          <Link
            href="/"
            className={`inline-flex h-12 flex-1 items-center justify-center px-5 sm:max-w-[130px] ${SECONDARY_BUTTON_CLASS}`}
          >
            홈으로
          </Link>
        </div>

        {/* 예전에는 이 자리가 「10초 후 홈으로 이동합니다」 카운트다운이었다. 다음에 무슨 일이
            일어나는지를 말해 주는 자리로 바꾼다 — 사용자가 여기서 기다릴 필요가 없다는 뜻이다. */}
        <p className="mt-4 text-xs text-text-3">검수가 끝나면 알림으로 알려드려요.</p>
      </div>
    </>
  );
}
