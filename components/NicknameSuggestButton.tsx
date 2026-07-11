"use client";

import { useState } from "react";
import { fetchNicknameSuggestion } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";

// 가입 폼·온보딩에서 서비스가 생성한 닉네임을 다시 받아오는 버튼(이모지 금지 관례라 새로고침 SVG).
export default function NicknameSuggestButton({
  onSuggest,
}: {
  onSuggest: (nickname: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      onSuggest(await fetchNicknameSuggestion());
    } catch {
      // 추천 실패는 조용히 무시 — 사용자가 직접 입력하면 된다.
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1.5 self-start rounded-full border border-border-2 bg-white px-3 py-1.5 text-xs font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-60 ${FOCUS_RING}`}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={loading ? "animate-spin" : undefined}
      >
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
      다른 닉네임 추천
    </button>
  );
}
