"use client";

import { useEffect, useState } from "react";
import { mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionDetailResponse, DisputePhotoView } from "@/lib/types";

/**
 * 관리자 대금 처리 화면의 자료 대조(#647).
 *
 * <p>판단 방법이 「등록 자료와 제출 자료의 대조」다(운영정책 제16조 제3항). 지금까지 관리자는
 * 매물 상세를 <b>따로 열어</b> 대조했다 — 창을 오가는 동안 무엇을 보고 있었는지 놓친다.
 * 두 묶음을 같은 화면, <b>같은 크기</b>로 둔다. 한쪽만 크면 크기가 먼저 눈에 들어온다.
 *
 * <p>등록 자료는 공개 경매 상세에서 온다 — 관리자 전용 사본을 만들 이유가 없고, 구매자가
 * 본 것과 같은 것을 보는 편이 판단에 맞다.
 */
export default function AdminDisputeEvidence({
  orderId,
  auctionId,
}: {
  orderId: number;
  auctionId: number;
}) {
  const { fetchWithAuth } = useAuth();
  const [submitted, setSubmitted] = useState<DisputePhotoView[]>([]);
  const [listing, setListing] = useState<AuctionDetailResponse | null>(null);

  useEffect(() => {
    let alive = true;
    fetchWithAuth<DisputePhotoView[]>(`/api/admin/disputes/${orderId}/photos`)
      .then((res) => {
        if (alive) setSubmitted(res ?? []);
      })
      .catch(() => {
        if (alive) setSubmitted([]);
      });
    return () => {
      alive = false;
    };
  }, [orderId, fetchWithAuth]);

  useEffect(() => {
    let alive = true;
    fetchWithAuth<AuctionDetailResponse>(`/api/auctions/${auctionId}`)
      .then((res) => {
        if (alive) setListing(res ?? null);
      })
      .catch(() => {
        // 등록 자료를 못 읽어도 제출 자료는 보여준다 — 반쪽이라도 있는 편이 없는 편보다 낫다.
        if (alive) setListing(null);
      });
    return () => {
      alive = false;
    };
  }, [auctionId, fetchWithAuth]);

  const listingImages = listing?.images ?? [];
  if (submitted.length === 0 && listingImages.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      <Group
        label={`구매자 제출 ${submitted.length}장`}
        empty="제출된 사진이 없어요 — 사유가 사진을 요구하지 않거나 보유기간이 지났어요"
        photos={submitted.map((p) => ({ key: `s${p.id}`, url: p.url, thumbnailUrl: p.thumbnailUrl }))}
      />
      <Group
        label={`등록 자료 ${listingImages.length}장${listing?.video ? " + 영상" : ""}`}
        empty="등록 자료를 읽지 못했어요"
        photos={listingImages.map((img, i) => ({
          key: `l${i}`,
          url: img.displayUrl ?? img.url,
          thumbnailUrl: img.thumbnailUrl,
        }))}
        videoUrl={listing?.video?.url ?? null}
      />
    </div>
  );
}

function Group({
  label,
  empty,
  photos,
  videoUrl,
}: {
  label: string;
  empty: string;
  photos: { key: string; url: string; thumbnailUrl: string }[];
  videoUrl?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-text-2">{label}</p>
      {photos.length === 0 && !videoUrl ? (
        <p className="mt-1.5 text-[11px] text-text-3">{empty}</p>
      ) : (
        <div className="mt-1.5 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {photos.map((photo) => (
            <a
              key={photo.key}
              href={mediaUrl(photo.url)}
              target="_blank"
              rel="noreferrer"
              className={`block overflow-hidden rounded-r2 border border-border ${FOCUS_RING}`}
            >
              {/* next/image를 쓰지 않는다 — 반품 사진은 6개월 뒤 파기돼 URL이 사라지고,
                  최적화 캐시가 남으면 파기 뒤에도 이미지가 뜬다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(photo.thumbnailUrl)}
                alt=""
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </a>
          ))}
          {videoUrl && (
            <a
              href={mediaUrl(videoUrl)}
              target="_blank"
              rel="noreferrer"
              className={`flex aspect-square items-center justify-center rounded-r2 border border-border bg-surface-2 text-[11px] font-bold text-text-2 ${FOCUS_RING}`}
            >
              영상
            </a>
          )}
        </div>
      )}
    </div>
  );
}
