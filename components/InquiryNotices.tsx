import Link from "next/link";
import { FOCUS_RING } from "@/lib/ui";

const NOTICES = [
  "문의 내용에 주민등록번호, 결제 비밀번호 등 민감한 개인정보를 포함하지 마세요.",
  "문의는 접수된 순서대로 확인하며 내용에 따라 답변까지 시간이 걸릴 수 있어요.",
  "답변이 등록되면 알림으로 알려드려요.",
  "욕설, 비방, 반복 문의 등 운영을 방해하는 내용은 답변이 제한될 수 있어요.",
];

export default function InquiryNotices() {
  return (
    <section
      className="mt-9 border-t border-border bg-surface-2/60 px-5 py-7 sm:px-7"
      aria-labelledby="inquiry-notices-title"
    >
      <h2 id="inquiry-notices-title" className="text-base font-extrabold text-text-1">
        유의사항
      </h2>
      <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-text-3">
        {NOTICES.map((notice) => (
          <li key={notice} className="flex gap-2">
            <span aria-hidden="true">·</span>
            <span>{notice}</span>
          </li>
        ))}
        <li className="flex gap-2">
          <span aria-hidden="true">·</span>
          <span>
            문의 전{" "}
            <Link
              href="/faq"
              className={
                "font-bold text-text-2 underline decoration-border-2 underline-offset-4 hover:text-primary " +
                FOCUS_RING
              }
            >
              자주 묻는 질문
            </Link>
            을 확인하면 더 빠르게 해결할 수 있어요.
          </span>
        </li>
      </ul>
    </section>
  );
}
