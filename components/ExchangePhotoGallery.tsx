"use client";

import { useRef, useState, type PointerEvent } from "react";
import MediaZoomViewer from "@/components/MediaZoomViewer";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { ExchangePostDetail } from "@/lib/types";

export default function ExchangePhotoGallery({
  photos,
  title,
  compact = false,
}: {
  photos: ExchangePostDetail["photos"];
  title: string;
  compact?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [active, setActive] = useState(0);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const multiple = photos.length > 1;

  function scrollToPhoto(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(photos.length - 1, index));
    track.scrollTo({
      left: next * track.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!multiple || event.pointerType !== "mouse" || event.button !== 0) return;
    dragRef.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerType !== "mouse") return;
    const track = event.currentTarget;
    const distance = drag.x - event.clientX;
    if (!drag.moved) {
      if (Math.abs(distance) < 8) return;
      drag.moved = true;
      // Capture only after a drag begins so a normal click still reaches the photo.
      track.setPointerCapture(event.pointerId);
      track.style.scrollSnapType = "none";
    }
    track.scrollLeft = drag.left + distance;
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerType !== "mouse") return;
    dragRef.current = null;
    if (!drag.moved) return;
    const track = event.currentTarget;
    const distance = drag.x - event.clientX;
    const initial = Math.round(drag.left / track.clientWidth);
    track.style.scrollSnapType = "";
    scrollToPhoto(initial + (event.type === "pointerup" && Math.abs(distance) >= 48 ? Math.sign(distance) : 0));
  }

  if (photos.length === 0) return null;

  const previews = compact ? photos.slice(0, 3) : photos;
  const photoButtons = previews.map((photo, index) => (
    <button
      key={`${photo.url}-${index}`}
      type="button"
      aria-label={`${title} 사진 ${index + 1} 확대`}
      onClick={() => setZoomIndex(index)}
      className={`cursor-zoom-in ${FOCUS_RING} ${compact
        ? "h-16 w-12 shrink-0 overflow-hidden rounded-control border border-border bg-surface-2"
        : "h-full w-full shrink-0 snap-center snap-always"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 사진 */}
      <img
        src={mediaUrl(compact ? photo.thumbnailUrl || photo.url : photo.url)}
        alt=""
        draggable={false}
        loading={compact || index > 0 ? "lazy" : undefined}
        decoding="async"
        className="h-full w-full select-none object-contain"
      />
    </button>
  ));

  return (
    <>
      {compact ? (
        <div className="flex shrink-0 gap-1">{photoButtons}</div>
      ) : (
        <div className="relative overflow-hidden rounded-card border border-border bg-surface-2">
          <div
            ref={trackRef}
            onScroll={(event) => {
              const track = event.currentTarget;
              setActive(Math.round(track.scrollLeft / track.clientWidth));
            }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onLostPointerCapture={finishDrag}
            onPointerLeave={() => {
              if (!dragRef.current?.moved) dragRef.current = null;
            }}
            className="flex h-64 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] sm:h-96 [&::-webkit-scrollbar]:hidden"
          >
            {photoButtons}
          </div>
          {multiple && (
            <>
              {[-1, 1].map((direction) => (
                <button
                  key={direction}
                  type="button"
                  aria-label={direction < 0 ? "이전 사진" : "다음 사진"}
                  disabled={active + direction < 0 || active + direction >= photos.length}
                  onClick={() => scrollToPhoto(active + direction)}
                  className={`absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-text-1/60 text-white disabled:invisible ${direction < 0 ? "left-2" : "right-2"} ${FOCUS_RING}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={direction < 0 ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
                  </svg>
                </button>
              ))}
              <span className="pointer-events-none absolute bottom-2 right-2 rounded-control bg-text-1/60 px-2 py-1 text-caption font-semibold text-white tabular-nums">
                {active + 1} / {photos.length}
              </span>
            </>
          )}
        </div>
      )}
      <MediaZoomViewer
        open={zoomIndex !== null}
        images={photos}
        title={title}
        index={zoomIndex ?? 0}
        onIndexChange={setZoomIndex}
        onClose={() => setZoomIndex(null)}
      />
    </>
  );
}
