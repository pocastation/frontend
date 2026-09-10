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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`font-bold text-text-2 underline decoration-border-2 underline-offset-[3px] transition-colors hover:text-text-1 ${FOCUS_RING}`}
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
