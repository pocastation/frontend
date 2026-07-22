import type { InquiryCategory, InquiryStatus } from "./types";

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
  AUCTION: "경매·판매",
  PAYMENT: "결제·정산",
  DELIVERY: "배송",
  ETC: "기타",
};

export const INQUIRY_CATEGORIES = Object.entries(INQUIRY_CATEGORY_LABEL) as [
  InquiryCategory,
  string,
][];

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
