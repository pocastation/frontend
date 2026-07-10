"use client";

import { useState } from "react";
import { FOCUS_RING } from "@/lib/ui";

// Web Share API(모바일 대부분)가 없으면 클립보드 복사로 폴백 — 새 백엔드 없이 바로 되는 실제
// 기능이라 참고 디자인의 공유 아이콘을 장식이 아니라 그대로 살릴 수 있다.
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
      className={`flex items-center gap-1 rounded-r2 px-2 py-1 text-xs font-semibold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
    >
      <span aria-hidden="true">{copied ? "✓" : "⤴"}</span>
      {copied ? "복사됨" : "공유"}
    </button>
  );
}
