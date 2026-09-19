"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ReportButton from "@/components/ReportButton";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 교환글 더보기(⋮) — 신고 진입점을 담는 하단 시트.
 *
 * <p><b>왜 아이콘을 바로 두지 않나.</b> 판매글은 갤러리 위 액션 줄(공유·찜·신고)에 아이콘을
 * 늘어놓지만 교환글에는 그 줄이 없다. 사이렌을 본문에 새로 띄우면 화면에서 가장 센 신호가
 * 신고가 되는데, 교환글에서 가장 센 신호는 「신청하기」여야 한다.
 *
 * <p>차단하기는 여기 들어올 자리다(P3-3). 지금 넣지 않는 이유는 백엔드가 없어 누를 수 없는
 * 항목이 되기 때문이고, 사이렌을 앱바에 박아 두지 않은 이유이기도 하다 — 그때 다시 옮겨야 한다.
 */
export default function ExchangeMoreMenu({ postId }: { postId: number }) {
  const [open, setOpen] = useState(false);

  // 시트가 열린 동안 뒤 화면이 따라 스크롤되면 시트만 제자리에 남아 떠 보인다.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="더보기"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`-mr-2.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {/*
        body로 portal + z-[500]. 앱바가 z-300으로 스택 컨텍스트를 만들기 때문에 인라인으로 두면
        시트가 그 안에 갇힌다 — ReportButton 주석의 #635와 같은 함정이고, 모달(z-500)이 이
        시트 위로 올라와야 해서 시트는 그보다 한 칸 아래인 450에 둔다.
      */}
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[450] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="교환글 메뉴">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative rounded-t-r3 bg-surface pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5">
            <span aria-hidden="true" className="mx-auto mb-2 block h-1 w-9 rounded-full bg-border-2" />
            <ReportButton targetType="EXCHANGE_POST" targetId={postId} trigger="menu" onDone={() => setOpen(false)} />
            <div className="mx-3.5 my-1.5 h-px bg-border" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`mx-3.5 flex min-h-12 w-[calc(100%-28px)] items-center justify-center rounded-[7px] border border-border-2 bg-white text-[15px] font-extrabold text-text-2 ${FOCUS_RING}`}
            >
              닫기
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
