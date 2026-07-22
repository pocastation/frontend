import { INQUIRY_STATUS_CLASS, INQUIRY_STATUS_LABEL } from "@/lib/inquiries";
import type { InquiryStatus } from "@/lib/types";

export default function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={
        "inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold " +
        INQUIRY_STATUS_CLASS[status]
      }
    >
      {INQUIRY_STATUS_LABEL[status]}
    </span>
  );
}
