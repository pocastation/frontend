"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ReportModal, { ReportSirenIcon } from "@/components/ReportModal";
import { useAuth } from "@/lib/auth-context";
import { ACTION_ICON_BUTTON } from "@/lib/ui";
import type { ReportTargetType } from "@/lib/types";

/**
 * 신고 아이콘 버튼(판매글 갤러리 액션 줄).
 *
 * <p>모달은 {@link ReportModal}에 있다. 이 버튼은 늘 화면에 남아 있어 모달 상태를 쥐어도
 * 되지만, 시트 안처럼 먼저 사라지는 자리에서는 시트의 부모가 모달을 띄운다(#787,
 * ExchangeMoreMenu).
 */
export default function ReportButton({
  targetType,
  targetId,
}: {
  targetType: ReportTargetType;
  targetId: number;
}) {
  const { accessToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  function openModal() {
    if (!accessToken) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label={justSubmitted ? "신고 접수됨" : "신고하기"}
        title={justSubmitted ? "접수됨" : "신고"}
        className={ACTION_ICON_BUTTON}
      >
        {justSubmitted ? (
          // 접수 완료 체크
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <ReportSirenIcon />
        )}
      </button>

      <ReportModal
        targetType={targetType}
        targetId={targetId}
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={() => {
          setJustSubmitted(true);
          setTimeout(() => setJustSubmitted(false), 2500);
        }}
      />
    </>
  );
}
