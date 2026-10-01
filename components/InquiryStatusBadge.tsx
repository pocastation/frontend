import { INQUIRY_STATUS_CLASS, INQUIRY_STATUS_LABEL } from "@/lib/inquiries";
import type { InquiryStatus } from "@/lib/types";

export default function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={
        // 상태는 상자 없이 글자로(#767). 답변이 온 것이 가장 진하다.
        "inline-flex shrink-0 whitespace-nowrap text-[12px] " +
        INQUIRY_STATUS_CLASS[status]
      }
    >
      {INQUIRY_STATUS_LABEL[status]}
    </span>
  );
}
