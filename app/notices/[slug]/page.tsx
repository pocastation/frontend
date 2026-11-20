import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mediaUrl } from "@/lib/api";
import { CATEGORY_LABEL, findPublishedNotice, noticeDate } from "@/lib/support";
import { FOCUS_RING } from "@/lib/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const notice = await findPublishedNotice(slug);
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

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const notice = await findPublishedNotice(slug);
  if (!notice) {
    notFound();
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[720px] wrap-anywhere px-5 pt-9 pb-20 sm:pt-12">
      <Link
        href="/notices"
        className={`inline-flex items-center gap-1 rounded-control px-1 py-1 text-label font-semibold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
      >
        <span aria-hidden="true">←</span> 공지사항
      </Link>

      <header className="mt-4 border-b border-text-1/25 pb-5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label">
          <span className="font-bold text-text-3">{CATEGORY_LABEL[notice.category]}</span>
          <span className="tabular-nums text-text-3">{noticeDate(notice.publishAt)}</span>
        </p>
        <h1 className="mt-2 font-display text-title-l font-extrabold text-text-1 sm:text-display">
          {notice.title}
        </h1>
      </header>

      {/* 본문은 읽는 글이라 줄 길이를 제한한다 — 한 줄이 너무 길면 다음 줄을 찾기 어렵다. */}
      <div className="mt-6 max-w-[38rem]">
        {notice.body.split(/\n\s*\n/).map((paragraph, i) => (
          <p key={i} className="mt-4 whitespace-pre-line text-body-l text-text-2 first:mt-0">
            {paragraph}
          </p>
        ))}
        {notice.photoIds.map((id, index) => (
          // 비공개 전환이 즉시 반영되도록 이미지 최적화 캐시를 거치지 않는다.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={mediaUrl(`/api/support/notices/${notice.slug}/photos/${id}`)} alt={`공지 첨부 사진 ${index + 1}`} className="mt-4 max-w-full rounded-control" />
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
        <Link
          href="/notices"
          className={`text-body-s font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-text-1 hover:decoration-text-1 ${FOCUS_RING}`}
        >
          목록으로
        </Link>
        <Link
          href="/inquiries/new"
          className={`text-body-s font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-text-1 hover:decoration-text-1 ${FOCUS_RING}`}
        >
          문의하기
        </Link>
      </div>
    </div>
  );
}
