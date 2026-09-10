"use client";

import { useState } from "react";
import { FOCUS_RING } from "@/lib/ui";
import OrderInquiryModal from "./OrderInquiryModal";

/**
 * 거래 카드의 문의 진입 한 줄(#633).
 *
 * <p><b>버튼이 아니라 헬퍼 텍스트</b>다. 카드마다 버튼이 하나 더 늘면 목록 전체가 조작판처럼
 * 보이고, 구매확정·반품 요청 같은 실제 액션과 무게가 같아진다.
 *
 * <p><b>노출 조건을 두지 않는다.</b> 주문이 있는 카드면 결제 전·배송 중·분쟁 중·환불 완료 뒤까지
 * 항상 보인다. 막힌 사람이 찾아야 하는 줄이라 상태별로 분기하면 정작 필요한 순간에 없다 —
 * 「환불이 안 들어왔어요」는 종결된 거래에서 들어오는 문의다.
 */
export default function OrderInquiryLine({
  auctionId,
  title,
  role,
}: {
  auctionId: number;
  title: string;
  role: "BUYER" | "SELLER";
}) {
  const [open, setOpen] = useState(false);

  return (
    // pl-[56px]은 이 화면의 푸터 공통 들여쓰기다(썸네일 44px + 간격 12px) — 상태 줄과 같은 축에 선다.
    //
    // ⚠️ 이 줄을 `<p>`로 두면 안 된다. 모달이 이 안에서 렌더되고 모달 본문에는 `<p>`·`<div>`·
    // `<fieldset>`이 들어 있어, `<p>` 안에서는 브라우저가 태그를 강제로 닫아 하이드레이션이 깨진다.
    <div className="mt-1.5 pl-[56px] text-[11.5px] text-text-3">
      거래에 문제가 있나요?{" "}
      {/*
        의사요소로 히트 영역만 넓힌다. 11.5px 텍스트 링크라 기본 탭 타겟이 42×17px인데, 같은
        행의 「구매 확정」·「반품 요청」이 27~29px이고 WCAG 2.2 AA의 최소 24×24도 못 넘긴다.

        패딩+음수마진 대신 `after:absolute`를 쓰는 이유는 **행 높이가 1px도 안 밀려야** 해서다.
        인라인 요소에 패딩을 주면 음수 마진으로 상쇄해도 baseline 반올림으로 줄이 미세하게
        자란다. 의사요소는 흐름에서 빠져 있어 영향이 0이다.

        상하 6px만 넓히는 이유는 위 상태 줄과의 간격이 6px(mt-1.5)이어서다 — 더 넓히면 상태
        줄 버튼 위로 히트 영역이 올라가 그 버튼이 눌리지 않는다.
      */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative font-bold text-text-2 underline decoration-border-2 underline-offset-[3px] transition-colors after:absolute after:-inset-x-1.5 after:-inset-y-1.5 after:content-[''] hover:text-text-1 ${FOCUS_RING}`}
      >
        문의하기
      </button>
      {open && (
        <OrderInquiryModal
          auctionId={auctionId}
          title={title}
          role={role}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
