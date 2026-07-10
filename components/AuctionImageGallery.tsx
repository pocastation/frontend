"use client";

import { useState } from "react";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionImageResponse } from "@/lib/types";

export default function AuctionImageGallery({
  images,
  title,
}: {
  images: AuctionImageResponse[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];
  const hasMultiple = images.length > 1;

  function goTo(delta: number) {
    setActiveIndex((i) => (i + delta + images.length) % images.length);
  }

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-r4 border border-border bg-surface-2">
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 물리 파일을 직접 서빙(로컬 디스크/S3), Next 이미지 최적화 대상 아님
          <img
            key={active.url}
            src={mediaUrl(active.url)}
            alt={`${title} 사진 ${activeIndex + 1}`}
            className="h-full w-full object-contain animate-[fadeIn_150ms_ease-out]"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl" aria-hidden="true">
            🎴
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => goTo(-1)}
              aria-label="이전 사진"
              className={`absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-text-1/50 text-white transition-colors hover:bg-text-1/70 ${FOCUS_RING}`}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(1)}
              aria-label="다음 사진"
              className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-text-1/50 text-white transition-colors hover:bg-text-1/70 ${FOCUS_RING}`}
            >
              ›
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-text-1/60 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div role="tablist" aria-label="사진 목록" className="mt-3 grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`${index + 1}번째 사진 보기`}
              onClick={() => setActiveIndex(index)}
              className={`aspect-square overflow-hidden rounded-r2 border-2 transition-all ${FOCUS_RING} ${
                index === activeIndex
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
              <img
                src={mediaUrl(image.thumbnailUrl)}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
