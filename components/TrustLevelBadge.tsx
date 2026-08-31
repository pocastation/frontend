"use client";

/**
 * 거래 레벨 라벨 + 단계표 시트(#464, 시안 승인 2026-08-31).
 *
 * <p>「덕린이」가 무슨 뜻인지, 어떻게 올라가는지를 화면 어디에서도 설명하지 않았다.
 * 산정 기준은 백엔드에 이미 있으므로(TrustLevel·TrustScorePolicy) 이 컴포넌트는 그 표를
 * 열어 보여주는 창일 뿐이다 — 계산하지 않는다.
 *
 * <p>라벨에 점선 밑줄을 줘 「누를 수 있다」를 말하고, 탭하면 모바일은 바텀시트·데스크탑은
 * 중앙 다이얼로그로 같은 내용을 연다(sm: 분기 하나, 내용은 동일). 대상의 현재 레벨 행만
 * 배경띠 + 굵기로 강조한다 — 도트·배지 같은 장식은 쓰지 않는다(디자인 규칙).
 *
 * <p>🔴 body로 portal — 제안 선택 팝업이 조상 스택 컨텍스트에 갇혀 갤러리에 뚫린 전례(#454)와
 * 같은 위험을 처음부터 피한다.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TRUST_LEVELS } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";

function LevelSheet({ currentLevel, onClose }: { currentLevel: number | null; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex items-end justify-center sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label="거래 레벨 안내"
    >
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-text-1/40" />
      <div className="relative w-full rounded-t-r4 bg-white px-4 pb-[calc(16px_+_env(safe-area-inset-bottom))] pt-4 sm:max-w-[400px] sm:rounded-r3 sm:p-5">
        <p className="text-[15px] font-extrabold text-text-1">거래 레벨</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-2">
          구매확정까지 끝난 거래 수로 올라가요. 받은 후기 평점이 낮으면 레벨이 오르지 않을 수 있어요.
        </p>

        <ol className="mt-3 border-t border-border text-[12.5px]">
          {TRUST_LEVELS.map((row) => {
            const on = row.level === currentLevel;
            return (
              <li
                key={row.level}
                className={`grid grid-cols-[44px_1fr_auto] items-baseline gap-2.5 border-b border-border px-1 py-[7px] ${
                  on ? "-mx-4 bg-surface-2 px-5 sm:-mx-5" : ""
                }`}
              >
                <span
                  className={`font-display text-[11px] tabular-nums ${on ? "font-bold text-primary" : "text-text-3"}`}
                >
                  Lv.{row.level}
                </span>
                <span className={on ? "font-extrabold text-text-1" : "text-text-2"}>{row.label}</span>
                <span className={on ? "font-bold text-text-2" : "text-text-3"}>
                  {row.minTrades === 0 ? "첫 거래 전" : `거래 ${row.minTrades}회`}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 레벨 라벨을 감싸 단계표 시트를 여는 버튼으로 만든다.
 *
 * @param level 대상의 현재 레벨(1~10). 모르면 null — 시트에서 강조 행 없이 표만 보여준다.
 * @param children 기존 화면이 그리던 라벨 텍스트 그대로 — 표기(「Lv.1 덕린이」·「덕린이」)는
 *   화면마다 다르고, 이 컴포넌트는 표기를 바꾸지 않는다. 동작만 얹는다.
 */
export default function TrustLevelBadge({
  level,
  className,
  children,
}: {
  level: number | null;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          // SellerRow처럼 링크 안에 놓이는 자리가 있다 — 시트만 열리고 이동은 막는다.
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className={`cursor-help underline decoration-dotted decoration-text-3 underline-offset-[3px] ${FOCUS_RING} ${className ?? ""}`}
      >
        {children}
      </button>
      {open && <LevelSheet currentLevel={level} onClose={() => setOpen(false)} />}
    </>
  );
}
