"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
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
  const active = images[activeIndex];
  const hasMultiple = images.length > 1;

  const go = useCallback(
    (delta: number) => setActiveIndex((i) => (i + delta + images.length) % images.length),
    [images.length],
  );

  // ── 확대 뷰어(transform 기반 줌/팬) — 프레임마다 리렌더를 피하려고 변환 상태는 ref로 직접 적용 ──
  const viewRef = useRef<HTMLDivElement>(null);
  const zoomImgRef = useRef<HTMLImageElement>(null);
  const t = useRef({ scale: 1, tx: 0, ty: 0, minScale: 1, maxScale: 4, nw: 1, nh: 1 });
  const rafRef = useRef(0);

  // translate3d로 GPU 합성 레이어를 강제해 큰 이미지 이동 시 리페인트를 막는다(drag 버벅임 해소).
  const apply = useCallback(() => {
    const el = zoomImgRef.current;
    if (el) el.style.transform = `translate3d(${t.current.tx}px, ${t.current.ty}px, 0) scale(${t.current.scale})`;
  }, []);

  // 드래그/휠은 pointermove가 프레임보다 자주 발생 → rAF로 프레임당 한 번만 transform을 적용(coalesce).
  const scheduleApply = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      apply();
    });
  }, [apply]);

  const clampPan = useCallback(() => {
    const v = viewRef.current;
    if (!v) return;
    const s = t.current;
    const vw = v.clientWidth,
      vh = v.clientHeight,
      dw = s.nw * s.scale,
      dh = s.nh * s.scale;
    s.tx = dw <= vw ? (vw - dw) / 2 : Math.min(0, Math.max(vw - dw, s.tx));
    s.ty = dh <= vh ? (vh - dh) / 2 : Math.min(0, Math.max(vh - dh, s.ty));
  }, []);

  const fit = useCallback(() => {
    const v = viewRef.current;
    if (!v) return;
    const s = t.current;
    const vw = v.clientWidth,
      vh = v.clientHeight;
    if (!vw || !vh) return;
    s.minScale = Math.min(vw / s.nw, vh / s.nh); // 전체가 보이는 배율
    s.maxScale = Math.max(s.minScale * 4, 1); // 원본 픽셀 부근까지
    s.scale = s.minScale;
    s.tx = 0;
    s.ty = 0;
    clampPan();
    apply();
  }, [apply, clampPan]);

  // 확대 이미지 로드 완료 시 실제 크기로 전체보기 맞춤(사진 전환 때도 재실행).
  const onZoomLoad = useCallback(() => {
    const el = zoomImgRef.current;
    if (!el) return;
    t.current.nw = el.naturalWidth || 1;
    t.current.nh = el.naturalHeight || 1;
    fit();
  }, [fit]);

  // 휠 = 확대/축소(커서 기준). React onWheel은 passive라 preventDefault 불가 → 네이티브 리스너로.
  useEffect(() => {
    if (!zoomOpen) return;
    const v = viewRef.current;
    if (!v) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = t.current;
      const r = v.getBoundingClientRect();
      const cx = e.clientX - r.left,
        cy = e.clientY - r.top;
      const ns = Math.min(s.maxScale, Math.max(s.minScale, s.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      const k = ns / s.scale;
      s.tx = cx - (cx - s.tx) * k;
      s.ty = cy - (cy - s.ty) * k;
      s.scale = ns;
      clampPan();
      apply();
    };
    v.addEventListener("wheel", onWheel, { passive: false });
    return () => v.removeEventListener("wheel", onWheel);
  }, [zoomOpen, apply, clampPan]);

  // 키보드: ← → 전환, Esc 닫기.
  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomOpen(false);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomOpen, go]);

  // 드래그: 전체보기(최소배율)면 좌우로 사진 넘기기(스와이프), 확대 상태면 이동(pan).
  // 확대 상태에서 인접 사진(master)을 미리 디코드해 둔다 → 전환 시 로드 대기(끊김) 없음.
  useEffect(() => {
    if (!zoomOpen || !hasMultiple) return;
    const n = images.length;
    [images[(activeIndex + 1) % n], images[(activeIndex - 1 + n) % n]].forEach((img) => {
      const pre = new Image();
      pre.src = mediaUrl(img.url);
    });
  }, [zoomOpen, activeIndex, images, hasMultiple]);

  const drag = useRef({ down: false, sx: 0, sy: 0, stx: 0, sty: 0, atFit: false });
  function onPointerDown(e: React.PointerEvent) {
    const s = t.current;
    drag.current = { down: true, sx: e.clientX, sy: e.clientY, stx: s.tx, sty: s.ty, atFit: s.scale <= s.minScale + 0.001 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.down) return;
    const s = t.current;
    if (d.atFit) {
      s.tx = d.stx + (e.clientX - d.sx); // 손가락 따라 살짝 이동(스와이프 피드백)
    } else {
      s.tx = d.stx + (e.clientX - d.sx);
      s.ty = d.sty + (e.clientY - d.sy);
      clampPan();
    }
    scheduleApply(); // 프레임당 1회만 반영 → 버벅임 해소
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (d.down && d.atFit) {
      const dx = e.clientX - d.sx;
      const threshold = Math.min(80, (viewRef.current?.clientWidth ?? 400) * 0.15);
      if (Math.abs(dx) > threshold && hasMultiple) go(dx > 0 ? -1 : 1);
      else fit(); // 임계 미달이면 제자리로
    }
    d.down = false;
  }

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-r4 border border-border bg-surface-2">
        {active ? (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            aria-label="사진 확대해서 상태 검수"
            className={`absolute inset-0 h-full w-full cursor-zoom-in ${FOCUS_RING}`}
          >
            {/* 블러 배경 — 레터박스 여백을 같은 이미지의 흐린 확대본으로 채운다. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙(로컬/S3), Next 최적화 대상 아님 */}
            <img
              key={`${active.url}-bg`}
              src={mediaUrl(active.thumbnailUrl)}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
            />
            {/* 본 이미지 — display(폴백 url), object-contain으로 크롭 없이. LCP라 우선 로드. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙(로컬/S3), Next 최적화 대상 아님 */}
            <img
              key={active.url}
              src={displaySrc(active)}
              alt={`${title} 사진 ${activeIndex + 1}`}
              fetchPriority="high"
              decoding="async"
              className="relative h-full w-full object-contain animate-[fadeIn_150ms_ease-out]"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </button>
        ) : (
          <div className="flex h-full items-center justify-center text-6xl" aria-hidden="true">
            🎴
          </div>
        )}

        {hasMultiple && (
          <>
            {/* 화살표는 확대 버튼 위에 올리되 클릭을 확대와 분리(전파 차단). */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="이전 사진"
              className={`absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-text-1/50 text-white transition-colors hover:bg-text-1/70 ${FOCUS_RING}`}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="다음 사진"
              className={`absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-text-1/50 text-white transition-colors hover:bg-text-1/70 ${FOCUS_RING}`}
            >
              <ChevronRight />
            </button>
            <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-full bg-text-1/60 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
              {activeIndex + 1} / {images.length}
            </span>
          </>
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
              onClick={() => setActiveIndex(index)}
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

      {/* 확대 라이트박스 — master(url) 뷰어. 스크롤=줌, 드래그=이동/스와이프, 화살표·키보드 전환.
          헤더(.hdr, z-index:300)보다 위에 오도록 body로 portal + z-[400]. 조상 스택 컨텍스트에도 안 갇힘. */}
      {zoomOpen &&
        active &&
        createPortal(
          <div className="fixed inset-0 z-[400] flex flex-col bg-[rgba(8,7,12,0.94)]">
          <div className="flex items-center gap-3 px-4 py-3 pr-16 text-[12.5px] font-semibold text-white/90">
            <span className="tabular-nums">
              {activeIndex + 1} / {images.length}
            </span>
            <span className="hidden text-[11.5px] font-medium text-white/55 sm:inline">
              스크롤 확대·축소 · 드래그 이동 · 전체보기서 좌우로 넘기기
            </span>
          </div>
          {/* 닫기 — 항상 잘 보이도록 우상단 고정 원형 버튼(Esc로도 닫힘). */}
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="닫기"
            className={`absolute right-3.5 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 ${FOCUS_RING}`}
          >
            <XIcon />
          </button>
          <div
            ref={viewRef}
            className="relative flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              drag.current.down = false;
              fit();
            }}
            onDoubleClick={() => fit()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙(로컬/S3) */}
            {/* key remount 없이 src만 교체(엘리먼트 유지 → 전환 부드럽게). onLoad가 새 src마다 fit 재실행. */}
            <img
              ref={zoomImgRef}
              src={mediaUrl(active.url)}
              alt={`${title} 확대 ${activeIndex + 1}`}
              draggable={false}
              onLoad={onZoomLoad}
              className="absolute left-0 top-0 max-w-none origin-top-left select-none will-change-transform"
            />
          </div>
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="이전 사진"
                className={`absolute left-3.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 ${FOCUS_RING}`}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="다음 사진"
                className={`absolute right-3.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 ${FOCUS_RING}`}
              >
                <ChevronRight />
              </button>
            </>
          )}
          </div>,
          document.body,
        )}
    </div>
  );
}
