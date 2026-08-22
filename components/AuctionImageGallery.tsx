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

  // 확대 뷰 넘기기 방식을 기기별로 분기: 터치(모바일)=드래그 스와이프만, 마우스(데스크탑)=화살표만.
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

  // ── 확대 라이트박스: 가로 scroll-snap 페이저(당근/번개식) ──
  // 스와이프 이동은 브라우저 컴포지터가 처리(off-main-thread)해 항상 부드럽다.
  // 확대(scale>1)는 "현재 슬라이드 내부"에서만 일어나고, 이때 페이저 스크롤을 잠가 드래그가 팬이 된다.
  const overlayRef = useRef<HTMLDivElement>(null); // 확대 오버레이 루트(아래로 당겨 닫기 시 translateY 적용)
  const pagerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLImageElement | null)[]>([]);
  const rafRef = useRef(0);
  // 현재(활성) 슬라이드의 변환 상태. boxW/H=슬라이드 크기, pw/ph=object-contain으로 맞춰진 실제 그려지는 크기.
  const z = useRef({ scale: 1, tx: 0, ty: 0, maxScale: 4, boxW: 1, boxH: 1, pw: 1, ph: 1 });
  const [locked, setLocked] = useState(false); // scale>1이면 true → 페이저 스크롤 잠금

  // 활성 슬라이드 이미지에만 transform 적용(translate3d로 GPU 합성). 프레임당 1회(rAF coalesce).
  const applyActive = useCallback(() => {
    const el = slideRefs.current[activeIndex];
    if (el) el.style.transform = `translate3d(${z.current.tx}px, ${z.current.ty}px, 0) scale(${z.current.scale})`;
  }, [activeIndex]);
  const scheduleApply = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      applyActive();
    });
  }, [applyActive]);

  // 슬라이드 크기와 object-contain으로 그려지는 실제 이미지 크기를 측정(팬 클램프 기준).
  const measureActive = useCallback(() => {
    const pager = pagerRef.current;
    const img = slideRefs.current[activeIndex];
    if (!pager || !img) return;
    const s = z.current;
    s.boxW = pager.clientWidth;
    s.boxH = pager.clientHeight;
    const nw = img.naturalWidth || 1,
      nh = img.naturalHeight || 1;
    const fit = Math.min(s.boxW / nw, s.boxH / nh);
    s.pw = nw * fit;
    s.ph = nh * fit;
  }, [activeIndex]);

  // transform-origin center 기준: 확대 이미지가 슬라이드 밖으로 새지 않게 이동량을 제한.
  const clampActive = useCallback(() => {
    const s = z.current;
    const maxTx = Math.max(0, (s.pw * s.scale - s.boxW) / 2);
    const maxTy = Math.max(0, (s.ph * s.scale - s.boxH) / 2);
    s.tx = Math.min(maxTx, Math.max(-maxTx, s.tx));
    s.ty = Math.min(maxTy, Math.max(-maxTy, s.ty));
  }, []);

  // 전체보기로 되돌림(잠금 해제).
  const resetActive = useCallback(() => {
    const s = z.current;
    s.scale = 1;
    s.tx = 0;
    s.ty = 0;
    applyActive();
    setLocked(false);
  }, [applyActive]);

  // 커서/핀치 중심점을 고정한 채 배율만 바꾼다(슬라이드 중심 기준 좌표계).
  const zoomTo = useCallback(
    (ns: number, px: number, py: number) => {
      const s = z.current;
      const clamped = Math.min(s.maxScale, Math.max(1, ns));
      const cx = px - s.boxW / 2,
        cy = py - s.boxH / 2; // 중심 기준 좌표
      const c1 = (cx - s.tx) / s.scale,
        c2 = (cy - s.ty) / s.scale; // 현재 그 점 아래 콘텐츠 좌표
      s.scale = clamped;
      s.tx = cx - c1 * clamped;
      s.ty = cy - c2 * clamped;
      clampActive();
      setLocked(clamped > 1.001);
    },
    [clampActive],
  );

  // 활성 이미지 로드/전환 시 전체보기로 맞춤.
  const onSlideLoad = useCallback(
    (index: number) => {
      if (index !== activeIndex) return;
      measureActive();
      resetActive();
    },
    [activeIndex, measureActive, resetActive],
  );

  // 열릴 때 클릭한 사진 위치로 즉시 스크롤(애니메이션 없이).
  useEffect(() => {
    if (!zoomOpen) return;
    const pager = pagerRef.current;
    if (!pager) return;
    pager.scrollLeft = activeIndex * pager.clientWidth;
    measureActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 열림 순간 1회만 초기 위치 정렬.
  }, [zoomOpen]);

  // 네이티브 스와이프 정착 지점으로 활성 인덱스 동기화. 잠금(확대) 중이거나 프로그램 스크롤(화살표) 중엔 무시.
  const navLock = useRef(false);
  const navTimer = useRef(0);
  const onPagerScroll = useCallback(() => {
    if (locked || navLock.current) return;
    const pager = pagerRef.current;
    if (!pager) return;
    const idx = Math.round(pager.scrollLeft / pager.clientWidth);
    if (idx !== activeIndex && idx >= 0 && idx < images.length) {
      setActiveIndex(idx);
      z.current.scale = 1;
      z.current.tx = 0;
      z.current.ty = 0;
    }
  }, [locked, activeIndex, images.length]);

  // 화살표/키보드용 — 인덱스를 즉시 갱신(스무스 스크롤 이벤트에 의존하지 않음)하고 해당 슬라이드로 부드럽게 이동.
  // navLock으로 애니메이션 중 onPagerScroll이 중간 위치를 이전 인덱스로 되돌리는 깜빡임을 막는다.
  const scrollToIndex = useCallback(
    (i: number) => {
      const pager = pagerRef.current;
      if (!pager) return;
      const idx = Math.max(0, Math.min(images.length - 1, i));
      navLock.current = true;
      setActiveIndex(idx);
      z.current.scale = 1;
      z.current.tx = 0;
      z.current.ty = 0;
      pager.scrollTo({ left: idx * pager.clientWidth, behavior: "smooth" });
      window.clearTimeout(navTimer.current);
      navTimer.current = window.setTimeout(() => {
        navLock.current = false;
      }, 500);
    },
    [images.length],
  );

  // 데스크탑 휠 = 확대/축소(커서 기준). React onWheel은 passive라 네이티브 리스너로 preventDefault.
  useEffect(() => {
    if (!zoomOpen) return;
    const pager = pagerRef.current;
    if (!pager) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      measureActive(); // 캐시된 이미지로 onLoad를 놓쳤을 때 대비해 상호작용 시점에 재측정.
      const r = pager.getBoundingClientRect();
      const ns = z.current.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12);
      zoomTo(ns, e.clientX - r.left, e.clientY - r.top);
      applyActive();
    };
    pager.addEventListener("wheel", onWheel, { passive: false });
    return () => pager.removeEventListener("wheel", onWheel);
  }, [zoomOpen, zoomTo, applyActive, measureActive]);

  // 데스크탑 마우스 드래그 = 확대(scale>1) 상태에서만 팬. 전체보기(fit)에선 팬 안 하고 화살표/스크롤에 맡긴다.
  // (터치 팬은 별도 touch 핸들러가 처리 — 여기선 마우스만.)
  useEffect(() => {
    if (!zoomOpen) return;
    const pager = pagerRef.current;
    if (!pager) return;
    let dragging = false;
    let sx = 0,
      sy = 0,
      stx = 0,
      sty = 0;
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0 || z.current.scale <= 1.001) return; // 좌클릭 + 확대 상태에서만
      dragging = true;
      sx = e.clientX;
      sy = e.clientY;
      stx = z.current.tx;
      sty = z.current.ty;
      pager.style.cursor = "grabbing";
      e.preventDefault();
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      e.preventDefault();
      z.current.tx = stx + (e.clientX - sx);
      z.current.ty = sty + (e.clientY - sy);
      clampActive();
      scheduleApply();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      pager.style.cursor = z.current.scale > 1.001 ? "grab" : "";
      applyActive();
    };
    pager.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      pager.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [zoomOpen, clampActive, scheduleApply, applyActive]);

  // 터치: 두 손가락=핀치 확대/축소, 확대 상태 한 손가락=팬. 전체보기 한 손가락은 네이티브 스와이프에 맡김.
  const gesture = useRef({
    pinch: false,
    startDist: 0,
    startScale: 1,
    startTx: 0,
    startTy: 0,
    midX: 0,
    midY: 0,
    pan: false,
    sx: 0,
    sy: 0,
    stx: 0,
    sty: 0,
    // 전체보기 상태에서 아래로 당겨 닫기(pull-to-dismiss).
    pull: false, // 세로 당김 제스처로 확정됨
    pullDecided: false, // 방향 판정 완료(가로=네이티브 스와이프에 양보)
    psx: 0,
    psy: 0,
    pdy: 0, // 현재 세로 이동량
  });
  useEffect(() => {
    if (!zoomOpen) return;
    const pager = pagerRef.current;
    if (!pager) return;
    const rectXY = (t0: Touch) => {
      const r = pager.getBoundingClientRect();
      return { x: t0.clientX - r.left, y: t0.clientY - r.top };
    };
    const onStart = (e: TouchEvent) => {
      const g = gesture.current;
      if (e.touches.length === 2) {
        const a = e.touches[0],
          b = e.touches[1];
        g.pinch = true;
        g.pan = false;
        g.startDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
        g.startScale = z.current.scale;
        g.startTx = z.current.tx;
        g.startTy = z.current.ty;
        const r = pager.getBoundingClientRect();
        g.midX = (a.clientX + b.clientX) / 2 - r.left;
        g.midY = (a.clientY + b.clientY) / 2 - r.top;
        measureActive();
        e.preventDefault();
      } else if (e.touches.length === 1 && z.current.scale > 1.001) {
        const p = rectXY(e.touches[0]);
        g.pan = true;
        g.pinch = false;
        g.sx = p.x;
        g.sy = p.y;
        g.stx = z.current.tx;
        g.sty = z.current.ty;
      } else if (e.touches.length === 1) {
        // 전체보기 한 손가락: 세로 당김 판정 준비(가로면 네이티브 스와이프에 양보).
        g.pan = false;
        g.pull = false;
        g.pullDecided = false;
        g.psx = e.touches[0].clientX;
        g.psy = e.touches[0].clientY;
        g.pdy = 0;
      }
    };
    const onMove = (e: TouchEvent) => {
      const g = gesture.current;
      const s = z.current;
      if (g.pinch && e.touches.length >= 2) {
        e.preventDefault();
        const a = e.touches[0],
          b = e.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
        const k = dist / g.startDist;
        const ns = Math.min(s.maxScale, Math.max(1, g.startScale * k));
        // 시작 중심점을 고정한 채 배율 적용 + 두 손가락 이동만큼 팬.
        const c1 = (g.midX - s.boxW / 2 - g.startTx) / g.startScale;
        const c2 = (g.midY - s.boxH / 2 - g.startTy) / g.startScale;
        const r = pager.getBoundingClientRect();
        const curMidX = (a.clientX + b.clientX) / 2 - r.left;
        const curMidY = (a.clientY + b.clientY) / 2 - r.top;
        s.scale = ns;
        s.tx = g.midX - s.boxW / 2 - c1 * ns + (curMidX - g.midX);
        s.ty = g.midY - s.boxH / 2 - c2 * ns + (curMidY - g.midY);
        clampActive();
        if (ns > 1.001 !== locked) setLocked(ns > 1.001);
        scheduleApply();
      } else if (g.pan && e.touches.length === 1 && s.scale > 1.001) {
        e.preventDefault();
        const p = rectXY(e.touches[0]);
        s.tx = g.stx + (p.x - g.sx);
        s.ty = g.sty + (p.y - g.sy);
        clampActive();
        scheduleApply();
      } else if (e.touches.length === 1 && s.scale <= 1.001) {
        // 전체보기: 아래로 당기면 오버레이를 따라 내리고(닫기 예고), 가로면 네이티브 스와이프에 맡긴다.
        const dx = e.touches[0].clientX - g.psx;
        const dy = e.touches[0].clientY - g.psy;
        if (!g.pullDecided && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
          g.pullDecided = true;
          g.pull = dy > 0 && Math.abs(dy) > Math.abs(dx); // 아래로 & 세로 우세일 때만 당김
        }
        if (g.pull) {
          e.preventDefault();
          g.pdy = Math.max(0, dy);
          const ov = overlayRef.current;
          if (ov) {
            ov.style.transition = "none";
            ov.style.transform = `translateY(${g.pdy}px)`;
            ov.style.opacity = String(Math.max(0.4, 1 - g.pdy / 500));
          }
        }
      }
    };
    const onEnd = (e: TouchEvent) => {
      const g = gesture.current;
      if (e.touches.length < 2) g.pinch = false;
      if (e.touches.length === 0) {
        g.pan = false;
        if (g.pull) {
          // 충분히 내렸으면 닫고, 아니면 제자리로 스냅백.
          const ov = overlayRef.current;
          const threshold = Math.min(140, (pager.clientHeight || 600) * 0.18);
          if (g.pdy > threshold) {
            if (ov) {
              ov.style.transition = "transform 180ms ease, opacity 180ms ease";
              ov.style.transform = `translateY(${pager.clientHeight || 800}px)`;
              ov.style.opacity = "0";
            }
            window.setTimeout(() => setZoomOpen(false), 170);
          } else if (ov) {
            ov.style.transition = "transform 200ms ease, opacity 200ms ease";
            ov.style.transform = "translateY(0px)";
            ov.style.opacity = "1";
          }
          g.pull = false;
          g.pullDecided = false;
        } else if (z.current.scale <= 1.001) {
          resetActive();
        } else {
          applyActive();
        }
      }
    };
    pager.addEventListener("touchstart", onStart, { passive: false });
    pager.addEventListener("touchmove", onMove, { passive: false });
    pager.addEventListener("touchend", onEnd);
    pager.addEventListener("touchcancel", onEnd);
    return () => {
      pager.removeEventListener("touchstart", onStart);
      pager.removeEventListener("touchmove", onMove);
      pager.removeEventListener("touchend", onEnd);
      pager.removeEventListener("touchcancel", onEnd);
    };
  }, [zoomOpen, locked, measureActive, clampActive, scheduleApply, resetActive, applyActive]);

  // 키보드: ← → 전환, Esc 닫기.
  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomOpen(false);
      else if (e.key === "ArrowLeft") scrollToIndex(Math.max(0, activeIndex - 1));
      else if (e.key === "ArrowRight") scrollToIndex(Math.min(images.length - 1, activeIndex + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomOpen, activeIndex, images.length, scrollToIndex]);

  // 더블클릭/더블탭 = 전체보기 ↔ 2배 토글.
  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const pager = pagerRef.current;
      if (!pager) return;
      measureActive(); // 상호작용 시점 재측정(onLoad 누락 대비).
      const r = pager.getBoundingClientRect();
      if (z.current.scale > 1.001) resetActive();
      else zoomTo(2, e.clientX - r.left, e.clientY - r.top);
      applyActive();
    },
    [resetActive, zoomTo, applyActive, measureActive],
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

      {/* 확대 라이트박스 — 가로 scroll-snap 페이저(당근/번개식). 슬라이드=master(url) 1장.
          네이티브 스와이프로 넘기고(off-main-thread), 핀치/휠로 슬라이드 내부 확대. scale>1이면 스크롤 잠금.
          헤더(.hdr, z-index:300)보다 위에 오도록 body로 portal + z-[400]. 조상 스택 컨텍스트에도 안 갇힘. */}
      {zoomOpen &&
        active &&
        createPortal(
          <div ref={overlayRef} className="fixed inset-0 z-[400] flex flex-col bg-[rgba(8,7,12,0.94)]">
            {/* 페이지 카운터 — 브라우징 뷰와 통일해 우하단. 여러 장일 때만 노출. */}
            {hasMultiple && (
              <span className="pointer-events-none absolute bottom-3 right-3.5 z-10 rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-semibold text-white tabular-nums">
                {activeIndex + 1} / {images.length}
              </span>
            )}
            {/* 닫기 — 항상 잘 보이도록 우상단 고정 원형 버튼(Esc로도 닫힘). */}
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              aria-label="닫기"
              className={`absolute right-3.5 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 ${FOCUS_RING}`}
            >
              <XIcon />
            </button>
            {/* 페이저 — 확대 중(locked)이면 overflow/touch를 잠가 드래그가 슬라이드 팬이 되게 한다. */}
            <div
              ref={pagerRef}
              onScroll={onPagerScroll}
              onDoubleClick={onDoubleClick}
              className="flex flex-1 snap-x snap-mandatory overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                overflowX: locked ? "hidden" : "auto",
                overflowY: "hidden",
                touchAction: locked ? "none" : "pan-x",
                cursor: locked ? "grab" : undefined,
              }}
            >
              {images.map((image, index) => (
                <div
                  key={image.url}
                  className="relative h-full w-full shrink-0 snap-center snap-always overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙(로컬/S3) */}
                  <img
                    ref={(el) => {
                      slideRefs.current[index] = el;
                    }}
                    src={mediaUrl(image.url)}
                    alt={`${title} 확대 ${index + 1}`}
                    draggable={false}
                    onLoad={() => onSlideLoad(index)}
                    className="absolute inset-0 h-full w-full select-none object-contain will-change-transform"
                  />
                </div>
              ))}
            </div>
            {/* 확대 뷰 화살표는 데스크탑(마우스)에서만 — 모바일은 스와이프로 넘긴다.
                끝(첫/마지막 사진)에선 그 방향 화살표를 숨겨 경계임을 알린다. */}
            {hasMultiple && !isTouch && activeIndex > 0 && (
              <button
                type="button"
                onClick={() => scrollToIndex(activeIndex - 1)}
                aria-label="이전 사진"
                className={`absolute left-3.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 ${FOCUS_RING}`}
              >
                <ChevronLeft />
              </button>
            )}
            {hasMultiple && !isTouch && activeIndex < images.length - 1 && (
              <button
                type="button"
                onClick={() => scrollToIndex(activeIndex + 1)}
                aria-label="다음 사진"
                className={`absolute right-3.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 ${FOCUS_RING}`}
              >
                <ChevronRight />
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
