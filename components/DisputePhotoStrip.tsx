"use client";

import { useEffect, useState } from "react";
import { mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";
import type { DisputePhotoListResponse, DisputePhotoView } from "@/lib/types";

/**
 * 반품에 첨부된 사진 줄(#647).
 *
 * 구매자는 자기가 무엇을 냈는지, 판매자는 무엇을 근거로 다투는지 알아야 한다. 목록 행 아래
 * 한 줄로 붙이고 누르면 원본을 새 탭에서 띄운다.
 *
 * <p>🔴 <b>판매자는 관리자가 전달한 뒤부터만 볼 수 있다</b>(BE #506). 그전에 요청하면 서버가
 * 403으로 답하므로 <b>줄 자체를 렌더하지 않는다</b> — 실패를 화면에 남기면 「사진이 있는데 못
 * 본다」로 읽히고, 실제로는 건의 존재조차 알려 주지 않는 것이 절차다.
 */
export default function DisputePhotoStrip({ auctionId }: { auctionId: number }) {
  const { fetchWithAuth } = useAuth();
  const [photos, setPhotos] = useState<DisputePhotoView[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchWithAuth<DisputePhotoListResponse>(`/api/auctions/${auctionId}/order/return/photos`)
      .then((res) => {
        if (alive) setPhotos(res?.photos ?? []);
      })
      .catch(() => {
        // 403(전달 전 판매자)·404 모두 줄을 숨긴다. 사진이 없는 것과 볼 수 없는 것을 화면에서
        // 구분하지 않는다 — 구분하면 존재 여부가 드러난다.
        if (alive) setPhotos([]);
      });
    return () => {
      alive = false;
    };
  }, [auctionId, fetchWithAuth]);

  if (!photos || photos.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {photos.map((photo, index) => (
        <a
          key={photo.id}
          href={mediaUrl(photo.url)}
          target="_blank"
          rel="noreferrer"
          className={`block overflow-hidden rounded-r1 border border-border ${FOCUS_RING}`}
          aria-label={`첨부 사진 ${index + 1} 원본 보기`}
        >
          {/* next/image를 쓰지 않는다 — 반품 사진은 6개월 뒤 파기돼 URL이 사라지고, 최적화
              캐시가 남으면 파기 뒤에도 이미지가 뜬다. 썸네일은 이미 서버가 줄여 둔 것이다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(photo.thumbnailUrl)}
            alt={`첨부 사진 ${index + 1}`}
            className="h-11 w-11 object-cover"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
