import { DISPUTE_STATUS_LABEL } from "./labels";
import type {
  InquiryCategory,
  InquiryOrderResponse,
  InquiryStatus,
  OrderInquiryTopic,
} from "./types";

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  RECEIVED: "접수완료",
  CHECKING: "확인중",
  ANSWERED: "답변완료",
};

export const INQUIRY_STATUS_CLASS: Record<InquiryStatus, string> = {
  RECEIVED: "bg-surface-3 text-text-2",
  CHECKING: "bg-primary-soft text-primary",
  ANSWERED: "bg-ok-soft text-ok",
};

export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  ACCOUNT: "회원·계정",
  AUCTION: "상품·판매",
  PAYMENT: "결제·정산",
  DELIVERY: "배송",
  ETC: "기타",
  ORDER: "거래 문의",
};

/**
 * 일반 문의 화면의 유형 선택지.
 *
 * 🔴 `INQUIRY_CATEGORY_LABEL`을 그대로 펼치지 않는다 — `ORDER`가 함께 뜨는데, 그 값은 거래
 * 화면에서만 접수되고 일반 경로로 보내면 서버가 400으로 막는다(BE #490). 고를 수 없는 선택지를
 * 보여주면 그걸 고른 사람은 제목·내용을 다 쓰고 나서 실패한다.
 */
export const INQUIRY_CATEGORIES = (
  Object.entries(INQUIRY_CATEGORY_LABEL) as [InquiryCategory, string][]
).filter(([code]) => code !== "ORDER");

/**
 * 거래 문의 유형 — 화면에 쓰는 말.
 *
 * enum 이름을 그대로 쓰지 않는다. 「정산」이라고 적으면 대금을 못 받은 판매자도 자기 문제인지
 * 알기 어렵고, 「배송」은 구매자·판매자 어느 쪽 문제인지 모른다. 사용자가 실제로 하는 말로 적는다.
 */
export const ORDER_INQUIRY_TOPIC_LABEL: Record<OrderInquiryTopic, string> = {
  DELIVERY: "물건이 오지 않아요 · 배송 조회가 안 돼요",
  SETTLEMENT: "구매확정이 안 돼서 대금을 못 받았어요",
  REFUND: "환불이 들어오지 않았어요",
  RETURN: "반품 절차를 문의해요",
  ETC: "그 외 문의",
};

/** 문의 내역 한 줄에 쓰는 짧은 이름 — 위 문장을 그대로 넣으면 제목보다 길어진다. */
export const ORDER_INQUIRY_TOPIC_SHORT: Record<OrderInquiryTopic, string> = {
  DELIVERY: "배송 문의",
  SETTLEMENT: "정산·대금 문의",
  REFUND: "환불 문의",
  RETURN: "반품 문의",
  ETC: "기타 문의",
};

export const ORDER_INQUIRY_TOPICS = Object.keys(
  ORDER_INQUIRY_TOPIC_LABEL,
) as OrderInquiryTopic[];

/**
 * 문의에 붙는 거래를 한 마디로 — 「지금 그 거래가 어디쯤인지」.
 *
 * <p>축이 셋(주문·이행·분쟁)이라 그대로 나열하면 문의 한 줄이 상태 세 개로 채워진다. 사람이
 * 먼저 알아야 하는 순서로 하나만 고른다: 반품이 열려 있으면 그것, 그다음 결제, 마지막이 배송이다.
 */
export function orderInquiryStateLabel(order: InquiryOrderResponse): string {
  if (order.disputeStatus !== "NONE" && order.disputeStatus !== "RESOLVED_DISMISSED") {
    return DISPUTE_STATUS_LABEL[order.disputeStatus];
  }
  switch (order.orderStatus) {
    case "REFUNDED":
      return "환불 완료";
    case "REFUNDING":
      return "환불 중";
    case "PAYMENT_DEFAULTED":
      return "미결제 종료";
    case "PAID":
      break;
    default:
      // PAYMENT_PENDING·재시도·다른 결제수단 유도 — 구매자가 결제할 차례라는 점은 같다.
      return "결제 대기";
  }
  switch (order.fulfillmentStatus) {
    case "CONFIRMED":
      return "거래 완료";
    case "SHIPPED":
      return "배송 중";
    case "PREPARING":
      return "물품 준비 중";
    case "AWAITING_SHIPMENT":
      return "발송 대기";
    default:
      return "결제 완료";
  }
}

export function formatInquiryDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
