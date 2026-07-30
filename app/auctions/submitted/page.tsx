"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FOCUS_RING } from "@/lib/ui";

// 검수 대기로 등록된 직후 안내 화면. 자동 승인이면 여기 오지 않고 곧바로 경매 상세로 간다
// (목적지는 등록 API가 돌려준 status로 정한다 — app/auctions/new/page.tsx).
const REDIRECT_SECONDS = 10;

function CheckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

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
    <main className="mx-auto w-full max-w-[560px] px-4 py-16 sm:py-24">
      <div className="rounded-r4 border border-border bg-surface p-7 text-center sm:p-9">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <CheckIcon />
        </span>

        <h1 className="mt-5 font-display text-xl font-extrabold text-text-1">등록 신청이 접수됐어요</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-text-3">
          사진 인증을 함께 제출한 매물은 관리자 검수를 거쳐 공개돼요.
          <br />
          <strong className="font-bold text-text-2">보통 1영업일 이내</strong>에 검수가 끝나고, 승인되면 그때부터 경매가 시작됩니다.
        </p>

        <dl className="mt-6 border-t border-border pt-5 text-left">
          <div className="flex items-center justify-between gap-3 py-1.5">
            <dt className="text-xs text-text-3">현재 상태</dt>
            <dd className="flex items-center gap-1.5 text-[13px] font-bold text-text-1">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-hidden="true" />
              검수 대기
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-1.5">
            <dt className="text-xs text-text-3">결과 안내</dt>
            <dd className="text-[13px] font-bold text-text-1">알림으로 알려드려요</dd>
          </div>
        </dl>

        <p className="mt-5 text-xs text-text-3">
          승인·거절 결과는 알림으로 전달되고, 판매 내역에서도 확인할 수 있어요.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/mypage?tab=selling"
            className={`inline-flex h-11 flex-1 items-center justify-center rounded-r2 bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
          >
            판매 내역 보기
          </Link>
          <Link
            href="/"
            className={`inline-flex h-11 flex-1 items-center justify-center rounded-r2 border border-border-2 bg-white px-5 text-sm font-bold text-text-2 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
          >
            홈으로 가기
          </Link>
        </div>

        <p className="mt-4 text-xs text-text-3" aria-live="polite">
          {remaining > 0 ? `${remaining}초 후 홈으로 이동합니다.` : "홈으로 이동 중..."}
        </p>
      </div>

      {auctionId && <p className="mt-3 text-center text-[11px] text-text-3">접수번호 #{auctionId}</p>}
    </main>
  );
}
