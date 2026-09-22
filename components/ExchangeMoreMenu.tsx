"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import ReportButton from "@/components/ReportButton";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING, PRESS_OUTLINE, PRESS_ROW } from "@/lib/ui";

/**
 * 교환글 더보기(⋮) — 신고 진입점을 담는 하단 시트.
 *
 * <p><b>왜 아이콘을 바로 두지 않나.</b> 판매글은 갤러리 위 액션 줄(공유·찜·신고)에 아이콘을
 * 늘어놓지만 교환글에는 그 줄이 없다. 사이렌을 본문에 새로 띄우면 화면에서 가장 센 신호가
 * 신고가 되는데, 교환글에서 가장 센 신호는 「신청하기」여야 한다.
 *
 * <p>차단하기가 같은 시트에 앉는다. 사이렌을 앱바에 박아 두지 않은 것이 이 때문이다 — 항목이
 * 둘이 되는 순간 아이콘 두 개가 앱바에 늘어선다.
 */
export default function ExchangeMoreMenu({
  postId,
  authorNickname,
}: {
  postId: number;
  authorNickname?: string | null;
}) {
  const { accessToken, fetchWithAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function block() {
    if (blocking) return;
    setBlocking(true);
    setError(null);
    try {
      await fetchWithAuth<void>("/api/exchange-blocks", { method: "POST", body: { postId } });
      setConfirmingBlock(false);
      setOpen(false);
      // 차단하면 이 글이 더는 보이지 않아야 한다. 같은 자리에 남겨 두면 방금 한 일이 무효로 보인다.
      router.replace("/events");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "차단하지 못했어요.");
      setBlocking(false);
    }
  }

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
            <button
              type="button"
              onClick={() => {
                if (!accessToken) {
                  router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
                  return;
                }
                setError(null);
                setConfirmingBlock(true);
              }}
              className={`flex min-h-[52px] w-full items-center gap-3 px-[18px] text-left text-[15px] font-bold text-text-1 hover:bg-surface-2 ${PRESS_ROW} ${FOCUS_RING}`}
            >
              <span className="text-text-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
                </svg>
              </span>
              {authorNickname ? `${authorNickname}님 차단하기` : "이 사용자 차단하기"}
            </button>
            <div className="mx-3.5 my-1.5 h-px bg-border" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`mx-3.5 flex min-h-12 w-[calc(100%-28px)] items-center justify-center rounded-[7px] border border-border-2 bg-white text-[15px] font-extrabold text-text-2 ${PRESS_OUTLINE} ${FOCUS_RING}`}
            >
              닫기
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/*
        차단은 한 번만 묻는다. 확인 문구가 실제 효과를 말하고, 마지막 줄이 되돌릴 수 있다는 것을
        알린다. 확인 버튼이 먹색인 것은 붉은색을 되돌릴 수 없는 일에 남겨 두기 위해서다.
      */}
      {confirmingBlock && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-r3 bg-surface p-5 shadow-modal">
            <h2 className="font-display text-base font-extrabold text-text-1">
              {authorNickname ? `${authorNickname}님을 차단할까요?` : "이 사용자를 차단할까요?"}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-text-2">
              서로의 교환글이 보이지 않고 신청도 주고받을 수 없어요.{" "}
              <b className="font-bold text-text-1">이미 확정된 교환</b>은 그대로 진행돼요.
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-text-3">
              상대에게는 알리지 않아요. 마이페이지에서 언제든 풀 수 있어요.
            </p>

            {error && (
              <p role="alert" className="mt-2 rounded-r2 bg-accent-soft px-3 py-2 text-[12px] font-semibold text-accent">
                {error}
              </p>
            )}

            <div className="mt-3.5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingBlock(false)}
                disabled={blocking}
                className={`h-11 flex-1 rounded-r2 border border-border-2 bg-white text-sm font-bold text-text-2 disabled:opacity-60 ${FOCUS_RING}`}
              >
                취소
              </button>
              <button
                type="button"
                onClick={block}
                disabled={blocking}
                className={`h-11 flex-1 rounded-r2 bg-text-1 text-sm font-bold text-white disabled:opacity-60 ${FOCUS_RING}`}
              >
                {blocking ? "차단하는 중..." : "차단"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
