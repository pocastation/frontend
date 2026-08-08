import Link from "next/link";
import { NOTICE_CATEGORY_LABEL, ORDERED_NOTICES } from "@/lib/notices-content";
import { FOCUS_RING } from "@/lib/ui";

export const metadata = {
  title: "공지사항 — Pocastation",
  description: "약관·정책 변경과 서비스 소식을 안내합니다.",
};

function formatDate(iso: string) {
  return iso.replace(/-/g, ". ");
}

/**
 * 공지사항 목록(#300).
 *
 * <p>서버 컴포넌트다 — 콘텐츠가 정적이라 클라이언트 상태가 필요 없고, HTML 에 그대로 실려
 * 검색 노출에도 유리하다.
 *
 * <p>목록을 <b>카드로 감싸지 않는다.</b> 공지는 같은 성격의 항목이 반복되는 목록이라
 * 구분은 헤어라인이 하면 충분하고, 카드로 감싸면 어느 것이 중요한지를 화면이 말해주지 못한다.
 */
export default function NoticesPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 pt-11 pb-20 sm:pt-14">
      <header>
        <p className="text-[12px] font-bold text-text-3">고객지원</p>
        <h1 className="mt-2 font-display text-[27px] font-extrabold leading-[1.15] tracking-[-0.04em] text-text-1 sm:text-[32px]">
          공지사항
        </h1>
        <p className="mt-3.5 max-w-[33rem] text-[13.5px] leading-[1.75] text-text-2">
          약관·정책이 바뀌거나 서비스에 변화가 있을 때 여기에 먼저 알려드려요.
        </p>
        <p className="mt-3 text-[12px] text-text-3">
          약관 개정은 시행일 7일 전(회원에게 불리한 개정은 30일 전)부터 이곳에 게시합니다
        </p>
      </header>

      <ul className="mt-8 border-t border-border">
        {ORDERED_NOTICES.map((notice) => (
          <li key={notice.slug} className="border-b border-border">
            <Link
              href={`/notices/${notice.slug}`}
              className={`group block py-5 ${FOCUS_RING}`}
            >
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px]">
                {/* 고정은 알약이나 색 배지가 아니라 글자로 말한다 — 목록에 색이 늘어나면
                    분류·날짜와 뒤섞여 무엇이 중요한지가 흐려진다. */}
                {notice.pinned && <span className="font-extrabold text-text-1">고정</span>}
                <span className="font-bold text-text-3">
                  {NOTICE_CATEGORY_LABEL[notice.category]}
                </span>
                <span className="tabular-nums text-text-3">{formatDate(notice.date)}</span>
              </span>
              <span className="mt-1.5 block font-display text-[16.5px] font-extrabold leading-[1.45] tracking-[-0.025em] text-text-1 transition-colors group-hover:text-primary">
                {notice.title}
              </span>
              <span className="mt-1 block text-[13px] leading-[1.7] text-text-2">
                {notice.summary}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-[12.5px] leading-[1.8] text-text-3">
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
