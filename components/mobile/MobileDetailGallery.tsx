"use client";

import { useRef, useState } from "react";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionImageResponse, AuctionVideoResponse } from "@/lib/types";

/**
 * 모바일 상세 상단 갤러리 — 좌우로 넘겨 보는 4:5 슬라이드.
 *
 * <p>**검수(틸팅) 영상이 마지막 슬라이드로 들어간다.** 데스크탑은 본문 아래 별도 블록으로 두지만,
 * 모바일에서 아래에 따로 두면 스크롤을 한참 내려야 나와 "영상이 있다"는 사실 자체를 놓친다.
 * 사진 다음 차례에 두면 사진을 넘기다 자연스럽게 만난다.
 *
 * <p>사진은 사용자 업로드라 세로·가로가 섞여 있다. 목록 카드는 `object-cover`로 채우지만
 * 상세는 **`object-contain` 레터박스**다 — 상세까지 잘라 버리면 확인하러 들어온 사람이
 * 확인을 못 한다(이 서비스의 핵심 가치가 확인이다).
 */

type Slide = { kind: "image"; src: string } | { kind: "video"; src: string; poster: string | null };

const SWIPE_PX = 40;

export default function MobileDetailGallery({
  images,
  video,
  title,
  actions,
}: {
  images: AuctionImageResponse[];
  video: AuctionVideoResponse | null | undefined;
  title: string;
  /** 우상단 오버레이 액션(공유·찜·신고) — 페이지가 넘겨준다. */
  actions?: React.ReactNode;
}) {
  const slides: Slide[] = [
    ...images.map((image) => ({ kind: "image" as const, src: mediaUrl(image.displayUrl ?? image.url) })),
    ...(video ? [{ kind: "video" as const, src: mediaUrl(video.url), poster: video.posterUrl ? mediaUrl(video.posterUrl) : null }] : []),
  ];
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (slides.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-surface-2 text-text-3">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  const current = slides[index];

  return (
    <div
      className="relative aspect-[4/5] overflow-hidden bg-surface-2"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        // 영상 위에서는 스와이프로 넘기지 않는다 — 재생 컨트롤 조작과 겹친다.
        if (current.kind !== "video" && Math.abs(dx) > SWIPE_PX) {
          setIndex((v) => Math.min(slides.length - 1, Math.max(0, v + (dx < 0 ? 1 : -1))));
        }
        touchStartX.current = null;
      }}
    >
      {current.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
        <img src={current.src} alt={title} className="h-full w-full object-contain" />
      ) : (
        <video
          controls
          playsInline
          preload="metadata"
          poster={current.poster ?? undefined}
          src={current.src}
          className="h-full w-full bg-black object-contain"
        />
      )}

      {actions && <div className="absolute right-3 top-3 z-[3] flex gap-1.5">{actions}</div>}

      {slides.length > 1 && (
        <>
          {/* 몇 장 중 몇 번째인지 — 영상 차례에는 그렇게 말해준다(사진이 하나 더 있는 줄 알게 두지 않는다). */}
          <span className="absolute bottom-3 right-3 z-[3] rounded-r1 bg-black/50 px-2 py-0.5 font-display text-[11px] text-white backdrop-blur-[2px]">
            {current.kind === "video" ? "검수영상" : `${index + 1} / ${images.length}`}
          </span>
          <div className="absolute bottom-3 left-0 right-0 z-[3] flex justify-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={i}
                type="button"
                aria-label={slide.kind === "video" ? "검수영상 보기" : `${i + 1}번째 사진 보기`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${FOCUS_RING} ${
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
