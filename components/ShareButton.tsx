"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { X_HANDLE } from "@/lib/site";
import { ACTION_ICON_BUTTON, FOCUS_RING } from "@/lib/ui";

/**
 * 상세 상단 공유(#287). X가 포카 거래의 주력 채널이라 **X를 첫 항목으로 고정**한다.
 *
 * <p>예전에는 버튼 하나가 "모바일이면 OS 공유 시트, 아니면 링크 복사"로 갈렸다. 데스크톱
 * 사용자는 복사한 뒤 X를 직접 열어 붙여야 했다 — 주력 채널로 가는 길이 가장 멀었다.
 *
 * <p><b>X API를 쓰지 않는다.</b> Web Intent는 글쓰기 창을 열어 사용자가 확인하고 게시한다.
 * 계정 연동(우리 서버가 대신 트윗)은 "이 앱이 내 계정으로 글을 쓸 수 있게 허용"을 받아야 해서
 * 거부율이 높고 유료 API가 따라온다. 클릭 수는 사실상 같다.
 */
export default function ShareButton({ title, hashtag }: { title: string; hashtag?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // navigator.share는 서버에 없다. effect에서 setState로 채우면 연쇄 렌더가 되고 린트도 막으므로,
  // 서버 스냅샷을 false로 둔 외부 스토어로 읽는다 — 값이 바뀌지 않으니 구독은 빈 함수다.
  const canNativeShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && !!navigator.share,
    () => false,
  );

  // 바깥 클릭·ESC로 닫기. 메뉴가 열린 채 남아 다른 조작을 가리는 것을 막는다.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function currentUrl() {
    return typeof window === "undefined" ? "" : window.location.href;
  }

  function shareToX() {
    // 가격·마감시간은 넣지 않는다 — 트윗은 남지만 가격은 변한다. 최신 값은 카드 미리보기가 보여준다.
    const params = new URLSearchParams({ text: title, url: currentUrl() });
    if (hashtag) params.set("hashtags", hashtag);
    if (X_HANDLE) params.set("via", X_HANDLE.replace(/^@/, ""));
    window.open(`https://x.com/intent/tweet?${params}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한 거부 등 — 조용히 무시한다. 주소창의 URL이 여전히 남는다.
    }
    setOpen(false);
  }

  async function shareNative() {
    try {
      await navigator.share({ title, url: currentUrl() });
    } catch {
      // 공유 시트 취소 — 오류가 아니다.
    }
    setOpen(false);
  }

  const itemClass =
    `flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-text-1 transition-colors hover:bg-surface-2 ${FOCUS_RING}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={copied ? "링크 복사됨" : "공유하기"}
        aria-haspopup="menu"
        aria-expanded={open}
        title={copied ? "복사됨" : "공유"}
        className={ACTION_ICON_BUTTON}
      >
        {copied ? (
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

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-r2 border border-border bg-surface py-1"
        >
          <button type="button" role="menuitem" onClick={shareToX} className={itemClass}>
            {/* X 로고 — 목적지를 알아보게 하는 식별 아이콘이라 장식 아이콘 금지 규칙과 다르다. */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            X에 공유
          </button>
          <button type="button" role="menuitem" onClick={copyLink} className={itemClass}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            링크 복사
          </button>
          {canNativeShare && (
            <button type="button" role="menuitem" onClick={shareNative} className={itemClass}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" x2="12" y1="2" y2="15" />
              </svg>
              다른 앱으로
            </button>
          )}
        </div>
      )}
    </div>
  );
}
