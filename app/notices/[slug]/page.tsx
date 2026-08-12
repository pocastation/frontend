import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NOTICES, NOTICE_CATEGORY_LABEL, findNotice } from "@/lib/notices-content";
import { FOCUS_RING } from "@/lib/ui";

/** 콘텐츠가 정적이라 빌드 시점에 전부 생성한다 — 요청마다 찾을 이유가 없다. */
export function generateStaticParams() {
  return NOTICES.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const notice = findNotice(slug);
  if (!notice) {
    return { title: "공지를 찾을 수 없어요 — Pocastation" };
  }
  return {
    title: `${notice.title} — Pocastation`,
    description: notice.summary,
    // 공지는 링크로 공유되는 일이 잦다(약관 개정 고지 등). 카드가 비어 보이지 않게 채운다.
    openGraph: {
      title: notice.title,
      description: notice.summary,
      type: "article",
      url: `/notices/${notice.slug}`,
    },
    twitter: { card: "summary_large_image", title: notice.title, description: notice.summary },
  };
}

function formatDate(iso: string) {
  return iso.replace(/-/g, ". ");
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const notice = findNotice(slug);
  if (!notice) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 pt-9 pb-20 sm:pt-12">
      <Link
        href="/notices"
        className={`inline-flex items-center gap-1 rounded-r2 px-1 py-1 text-xs font-semibold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
      >
        <span aria-hidden="true">←</span> 공지사항
      </Link>

      <header className="mt-4 border-b border-text-1/25 pb-5">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px]">
          <span className="font-bold text-text-3">{NOTICE_CATEGORY_LABEL[notice.category]}</span>
          <span className="tabular-nums text-text-3">{formatDate(notice.date)}</span>
        </p>
        <h1 className="mt-2 font-display text-[24px] font-extrabold leading-[1.3] tracking-[-0.035em] text-text-1 sm:text-[27px]">
          {notice.title}
        </h1>
      </header>

      {/* 본문은 읽는 글이라 줄 길이를 제한한다 — 한 줄이 너무 길면 다음 줄을 찾기 어렵다. */}
      <div className="mt-6 max-w-[38rem]">
        {notice.body.map((paragraph) => (
          <p key={paragraph} className="mt-4 text-[14.5px] leading-[1.85] text-text-2 first:mt-0">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
        <Link
          href="/notices"
          className={`text-[13px] font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-text-1 hover:decoration-text-1 ${FOCUS_RING}`}
        >
          목록으로
        </Link>
        <Link
          href="/inquiries/new"
          className={`text-[13px] font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-text-1 hover:decoration-text-1 ${FOCUS_RING}`}
        >
          문의하기
        </Link>
      </div>
    </div>
  );
}
