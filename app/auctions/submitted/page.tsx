"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FOCUS_RING } from "@/lib/ui";

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
 */
const REDIRECT_SECONDS = 10;

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const auctionId = searchParams.get("id");
  const [remaining, setRemaining] = useState(REDIRECT_SECONDS);

  // 1초마다 카운트다운하고 0이 되면 홈으로. 사용자가 아래 링크로 먼저 이동하면 언마운트되며 정리된다.
  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          clearInterval(timer);
          router.replace("/");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <main className="mx-auto w-full max-w-[560px] px-5 py-14 sm:py-20">
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

      <div className="mt-7 flex gap-2">
        <Link
          href="/mypage?tab=selling"
          className={`inline-flex h-12 flex-1 items-center justify-center rounded-r2 bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-dark sm:max-w-[180px] ${FOCUS_RING}`}
        >
          판매 내역 보기
        </Link>
        <Link
          href="/"
          className={`inline-flex h-12 flex-1 items-center justify-center rounded-r2 border border-border-2 bg-white px-5 text-sm font-bold text-text-2 transition-colors hover:border-primary hover:text-primary sm:max-w-[130px] ${FOCUS_RING}`}
        >
          홈으로
        </Link>
      </div>

      <p className="mt-4 text-xs text-text-3" aria-live="polite">
        {remaining > 0 ? `${remaining}초 후 홈으로 이동합니다.` : "홈으로 이동 중..."}
        {auctionId && ` · 접수번호 #${auctionId}`}
      </p>
    </main>
  );
}
