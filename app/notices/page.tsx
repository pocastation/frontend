import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { CATEGORY_LABEL, noticeDate, type Notice } from "@/lib/support";
import { FOCUS_RING } from "@/lib/ui";

export const metadata = {
  title: "공지사항 — Pocastation",
  description: "약관·정책 변경과 서비스 소식을 안내합니다.",
};

export default async function NoticesPage() {
  const notices = await apiFetch<Notice[]>("/api/support/notices", { cache: "no-store" });
  return (
    <div className="mx-auto max-w-[820px] px-gutter pt-page sm:px-5 sm:pt-14 sm:pb-20">
      <header>
        <p className="text-label font-bold text-text-3">고객지원</p>
        <h1 className="mt-2 font-display text-display font-extrabold text-text-1 sm:text-display">
          공지사항
        </h1>
        <p className="mt-4 max-w-[33rem] text-body text-text-2">
          약관·정책이 바뀌거나 서비스에 변화가 있을 때 여기에 먼저 알려드려요.
        </p>
      </header>

      <ul className="mt-8 wrap-anywhere border-t border-border">
        {notices.map((notice) => (
          <li key={notice.slug} className="border-b border-border">
            <Link
              href={`/notices/${notice.slug}`}
              className={`group block py-5 ${FOCUS_RING}`}
            >
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label">
                {/* 고정은 알약이나 색 배지가 아니라 글자로 말한다 — 목록에 색이 늘어나면
                    분류·날짜와 뒤섞여 무엇이 중요한지가 흐려진다. */}
                {notice.pinned && <span className="font-extrabold text-text-1">고정</span>}
                <span className="font-bold text-text-3">
                  {CATEGORY_LABEL[notice.category]}
                </span>
                <span className="tabular-nums text-text-3">{noticeDate(notice.publishAt)}</span>
              </span>
              <span className="mt-2 block font-display text-body-l font-extrabold text-text-1 transition-colors group-hover:text-primary">
                {notice.title}
              </span>
              <span className="mt-1 block text-body-s text-text-2">
                {notice.summary}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!notices.length && <p className="py-5 text-text-3">게시된 공지사항이 없습니다.</p>}

      <p className="mt-8 text-body-s text-text-3">
        문의가 있으시면{" "}
        <Link
          href="/inquiries/new"
          className={`font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary ${FOCUS_RING}`}
        >
          문의하기
        </Link>
        로 남겨 주세요. 자주 나오는 질문은{" "}
        <Link
          href="/faq"
          className={`font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary ${FOCUS_RING}`}
        >
          자주 묻는 질문
        </Link>
        에 정리돼 있어요.
      </p>
    </div>
  );
}
