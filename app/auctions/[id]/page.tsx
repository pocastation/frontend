import { notFound } from "next/navigation";
import Link from "next/link";
import AuctionImageGallery from "@/components/AuctionImageGallery";
import BidSection from "@/components/BidSection";
import { apiFetch, ApiError } from "@/lib/api";
import { GRADE_LABEL, SOURCE_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionDetailResponse } from "@/lib/types";

async function getAuction(id: string): Promise<AuctionDetailResponse | null> {
  try {
    return await apiFetch<AuctionDetailResponse>(`/api/auctions/${id}`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auction = await getAuction(id);
  if (!auction) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link
        href="/"
        className={`mb-4 inline-flex items-center gap-1 rounded-r2 px-1 py-1 text-xs font-semibold text-text-3 transition-colors hover:text-primary ${FOCUS_RING}`}
      >
        <span aria-hidden="true">←</span> 목록으로
      </Link>

      <div className="grid gap-8 sm:grid-cols-2">
        <AuctionImageGallery images={auction.images} title={auction.title} />

        {/* 정보 */}
        <div>
          <p className="text-xs font-bold tracking-wide text-primary">
            {auction.artistName}
            {auction.idolName ? ` · ${auction.idolName}` : ""}
          </p>
          <h1 className="mt-1 font-display text-xl font-extrabold text-text-1 sm:text-2xl">
            {auction.title}
          </h1>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
              {SOURCE_LABEL[auction.source] ?? auction.source}
              {auction.sourceDetail ? ` · ${auction.sourceDetail}` : ""}
            </span>
            <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs font-bold text-text-2">
              {GRADE_LABEL[auction.grade] ?? auction.grade}
            </span>
            {auction.unopened && (
              <span className="rounded-full bg-ok-soft px-2.5 py-1 text-xs font-bold text-ok">미개봉</span>
            )}
          </div>

          {auction.albumName && <p className="mt-3 text-sm text-text-2">앨범: {auction.albumName}</p>}

          <BidSection
            auctionId={auction.id}
            initialCurrentPrice={auction.currentPrice}
            initialBidCount={auction.bidCount}
            initialEndAt={auction.endAt}
            status={auction.status}
          />

          <p className="mt-4 text-sm text-text-3">판매자: {auction.sellerNickname}</p>

          {auction.conditionNote && (
            <section className="mt-6">
              <h2 className="text-sm font-bold text-text-1">상태 안내</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-2">
                {auction.conditionNote}
              </p>
            </section>
          )}

          {auction.description && (
            <section className="mt-6">
              <h2 className="text-sm font-bold text-text-1">상세 설명</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-2">
                {auction.description}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
