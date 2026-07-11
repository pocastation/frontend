"use client";

import { useState } from "react";
import { ACTION_ICON_BUTTON } from "@/lib/ui";

// Web Share API(모바일 대부분)가 없으면 클립보드 복사로 폴백. 상세 상단 액션(찜·신고)과 동일한
// 아웃라인 아이콘 버튼으로 통일 — 라벨 없이 아이콘만, 색 없음.
export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // 사용자가 공유 시트를 취소한 경우 등 — 조용히 무시.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 실패(권한 등) — 조용히 무시.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? "링크 복사됨" : "공유하기"}
      title={copied ? "복사됨" : "공유"}
      className={ACTION_ICON_BUTTON}
    >
      {copied ? (
        // 복사 완료 체크
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        // 공유(share-2) — Lucide
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
        </svg>
      )}
    </button>
  );
}
