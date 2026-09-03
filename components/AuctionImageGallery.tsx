"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MediaZoomViewer from "@/components/MediaZoomViewer";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionImageResponse } from "@/lib/types";

// 상세 기본 뷰는 display(1200)를, 확대 검수는 master(url, 2560)를 쓴다(#128·#149).
// display가 없는(다중 크기 이전) 이미지는 url로 폴백.
function displaySrc(image: AuctionImageResponse) {
  return mediaUrl(image.displayUrl ?? image.url);
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
export default function AuctionImageGallery({
  images,
  title,
}: {
  images: AuctionImageResponse[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const hasMultiple = images.length > 1;

  // 넘기기 방식을 기기별로 분기: 터치=스와이프만, 마우스=화살표만.
  // (확대 뷰의 같은 분기는 MediaZoomViewer가 자기 몫으로 갖는다 — #527에서 갈라졌다.)
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ── 매물 상세 브라우징 뷰: 가로 scroll-snap 페이저 ──
  // 모바일=스와이프로 넘김(화살표 없음), 데스크탑=화살표(끝에선 숨김). 루프 없음 — 양끝에서 멈춘다.
  const browsePagerRef = useRef<HTMLDivElement>(null);
  const browseNavLock = useRef(false);
  const browseNavTimer = useRef(0);

  // 네이티브 스와이프 정착 지점으로 활성 인덱스 동기화. 화살표 프로그램 스크롤 중(navLock)엔 무시.
  const onBrowseScroll = useCallback(() => {
    if (browseNavLock.current) return;
    const pager = browsePagerRef.current;
    if (!pager) return;
    const idx = Math.round(pager.scrollLeft / pager.clientWidth);
    if (idx !== activeIndex && idx >= 0 && idx < images.length) setActiveIndex(idx);
  }, [activeIndex, images.length]);

  // 화살표/썸네일용 — 인덱스를 즉시 갱신하고 해당 슬라이드로 부드럽게 스크롤(스무스 이벤트에 비의존).
  const browseScrollToIndex = useCallback(
    (i: number) => {
      const pager = browsePagerRef.current;
      if (!pager) return;
      const idx = Math.max(0, Math.min(images.length - 1, i));
      browseNavLock.current = true;
      setActiveIndex(idx);
      pager.scrollTo({ left: idx * pager.clientWidth, behavior: "smooth" });
      window.clearTimeout(browseNavTimer.current);
      browseNavTimer.current = window.setTimeout(() => {
        browseNavLock.current = false;
      }, 500);
    },
    [images.length],
  );

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-r4 border border-border bg-surface-2">
        {images.length > 0 ? (
          <>
            {/* 브라우징 페이저 — 모바일은 스와이프, 데스크탑은 화살표로 넘긴다. 슬라이드 탭=확대. */}
            <div
              ref={browsePagerRef}
              onScroll={onBrowseScroll}
              className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              // pan-x=가로 스와이프는 페이저가 가져가고, pan-y=세로 드래그는 페이지 스크롤로 넘긴다(세로 오버플로 없어 자연 체이닝).
              style={{ touchAction: "pan-x pan-y" }}
            >
              {images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  aria-label="사진 확대해서 상태 검수"
                  className={`relative h-full w-full shrink-0 snap-center snap-always cursor-zoom-in ${FOCUS_RING}`}
                >
                  {/* 블러 배경 — 레터박스 여백을 같은 이미지의 흐린 확대본으로 채운다. */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙(로컬/S3), Next 최적화 대상 아님 */}
                  <img
                    src={mediaUrl(image.thumbnailUrl)}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
                  />
                  {/* 본 이미지 — display(폴백 url), object-contain으로 크롭 없이. 첫 장은 LCP라 우선 로드. */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙(로컬/S3), Next 최적화 대상 아님 */}
                  <img
                    src={displaySrc(image)}
                    alt={`${title} 사진 ${index + 1}`}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    loading={index === 0 ? undefined : "lazy"}
                    decoding="async"
                    className="relative h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </button>
              ))}
            </div>

            {hasMultiple && (
              <>
                {/* 화살표는 데스크탑에서만, 끝(첫/마지막)에선 그 방향을 숨겨 경계임을 알린다. 모바일은 스와이프. */}
                {!isTouch && activeIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => browseScrollToIndex(activeIndex - 1)}
                    aria-label="이전 사진"
                    className={`absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-text-1/50 text-white transition-colors hover:bg-text-1/70 ${FOCUS_RING}`}
                  >
                    <ChevronLeft />
                  </button>
                )}
                {!isTouch && activeIndex < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => browseScrollToIndex(activeIndex + 1)}
                    aria-label="다음 사진"
                    className={`absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-text-1/50 text-white transition-colors hover:bg-text-1/70 ${FOCUS_RING}`}
                  >
                    <ChevronRight />
                  </button>
                )}
                <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-full bg-text-1/60 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                  {activeIndex + 1} / {images.length}
                </span>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-6xl" aria-hidden="true">
            🎴
          </div>
        )}
      </div>

      {hasMultiple && (
        <div role="tablist" aria-label="사진 목록" className="mt-3 grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`${index + 1}번째 사진 보기`}
              onClick={() => browseScrollToIndex(index)}
              className={`aspect-square overflow-hidden rounded-r2 border-2 transition-all ${FOCUS_RING} ${
                index === activeIndex ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
              <img
                src={mediaUrl(image.thumbnailUrl)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* 확대 뷰어 — 모바일 상세와 같은 컴포넌트를 쓴다(#527). 인덱스를 넘겨 주므로
          뷰어에서 넘긴 사진이 닫은 뒤 이 화면에도 그대로 남는다. */}
      <MediaZoomViewer
        open={zoomOpen}
        images={images}
        title={title}
        index={activeIndex}
        onIndexChange={setActiveIndex}
        onClose={() => setZoomOpen(false)}
      />
    </div>
  );
}
