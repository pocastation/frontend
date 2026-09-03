"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionImageResponse } from "@/lib/types";

/**
 * 사진 확대 뷰어 — 전체화면 라이트박스.
 *
 * <p>가로 scroll-snap 페이저(당근/번개식)다. 스와이프 이동은 브라우저 컴포지터가 처리해
 * (off-main-thread) 항상 부드럽고, 확대(scale&gt;1)는 <b>현재 슬라이드 내부</b>에서만 일어난다.
 * 확대 중에는 페이저 스크롤을 잠가 드래그가 팬이 된다.
 *
 * <p>🔴 원래 {@link AuctionImageGallery} 안에 있던 블록을 그대로 꺼낸 것이다(#527).
 * 모바일 상세(`MobileDetailGallery`)에는 <b>사진을 크게 볼 방법이 아예 없었는데</b>, 데스크탑에는
 * 핀치·팬·휠·더블탭·키보드·아래로 당겨 닫기까지 이미 갖춰져 있었다 — 새로 짜는 대신 꺼내서
 * 양쪽이 같이 쓴다. 동작은 한 줄도 바꾸지 않았다.
 *
 * <p><b>사진만 받는다.</b> 검수영상은 캐러셀에서 `controls playsInline`으로 재생되고 전체화면은
 * 기기 기본 재생기가 준다 — 영상은 확대해 뜯어보는 게 아니라 재생해서 보는 것이다.
 *
 * <p>인덱스는 <b>바깥이 쥔다</b>(controlled). 데스크탑은 뷰어에서 넘긴 사진이 닫은 뒤 본 화면에도
 * 그대로 남아야 하고, 모바일은 캐러셀이 이미 자기 인덱스를 갖고 있기 때문이다.
 */
export default function MediaZoomViewer({
  open,
  images,
  title,
  index,
  onIndexChange,
  onClose,
}: {
  open: boolean;
  images: AuctionImageResponse[];
  title: string;
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null); // 아래로 당겨 닫기 시 translateY가 걸리는 루트
  const pagerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLImageElement | null)[]>([]);
  const rafRef = useRef(0);
  // 현재(활성) 슬라이드의 변환 상태. boxW/H=슬라이드 크기, pw/ph=object-contain으로 맞춰진 실제 그려지는 크기.
  const z = useRef({ scale: 1, tx: 0, ty: 0, maxScale: 4, boxW: 1, boxH: 1, pw: 1, ph: 1 });
  const [locked, setLocked] = useState(false); // scale>1이면 true → 페이저 스크롤 잠금

  const hasMultiple = images.length > 1;

  // 화살표는 마우스 기기에만 — 터치는 스와이프로 넘긴다.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 활성 슬라이드 이미지에만 transform 적용(translate3d로 GPU 합성). 프레임당 1회(rAF coalesce).
  const applyActive = useCallback(() => {
    const el = slideRefs.current[index];
    if (el) el.style.transform = `translate3d(${z.current.tx}px, ${z.current.ty}px, 0) scale(${z.current.scale})`;
  }, [index]);
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
    const img = slideRefs.current[index];
    if (!pager || !img) return;
    const s = z.current;
    s.boxW = pager.clientWidth;
    s.boxH = pager.clientHeight;
    const nw = img.naturalWidth || 1,
      nh = img.naturalHeight || 1;
    const fit = Math.min(s.boxW / nw, s.boxH / nh);
    s.pw = nw * fit;
    s.ph = nh * fit;
  }, [index]);

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
    (i: number) => {
      if (i !== index) return;
      measureActive();
      resetActive();
    },
    [index, measureActive, resetActive],
  );

  // 열릴 때 누른 사진 위치로 즉시 스크롤(애니메이션 없이).
  useEffect(() => {
    if (!open) return;
    const pager = pagerRef.current;
    if (!pager) return;
    pager.scrollLeft = index * pager.clientWidth;
    measureActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 열림 순간 1회만 초기 위치 정렬.
  }, [open]);

  // 네이티브 스와이프 정착 지점으로 활성 인덱스 동기화. 잠금(확대) 중이거나 프로그램 스크롤(화살표) 중엔 무시.
  const navLock = useRef(false);
  const navTimer = useRef(0);
  const onPagerScroll = useCallback(() => {
    if (locked || navLock.current) return;
    const pager = pagerRef.current;
    if (!pager) return;
    const idx = Math.round(pager.scrollLeft / pager.clientWidth);
    if (idx !== index && idx >= 0 && idx < images.length) {
      onIndexChange(idx);
      z.current.scale = 1;
      z.current.tx = 0;
      z.current.ty = 0;
    }
  }, [locked, index, images.length, onIndexChange]);

  // 화살표/키보드용 — 인덱스를 즉시 갱신(스무스 스크롤 이벤트에 의존하지 않음)하고 해당 슬라이드로 부드럽게 이동.
  // navLock으로 애니메이션 중 onPagerScroll이 중간 위치를 이전 인덱스로 되돌리는 깜빡임을 막는다.
  const scrollToIndex = useCallback(
    (i: number) => {
      const pager = pagerRef.current;
      if (!pager) return;
      const idx = Math.max(0, Math.min(images.length - 1, i));
      navLock.current = true;
      onIndexChange(idx);
      z.current.scale = 1;
      z.current.tx = 0;
      z.current.ty = 0;
      pager.scrollTo({ left: idx * pager.clientWidth, behavior: "smooth" });
      window.clearTimeout(navTimer.current);
      navTimer.current = window.setTimeout(() => {
        navLock.current = false;
      }, 500);
    },
    [images.length, onIndexChange],
  );

  // 데스크탑 휠 = 확대/축소(커서 기준). React onWheel은 passive라 네이티브 리스너로 preventDefault.
  useEffect(() => {
    if (!open) return;
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
  }, [open, zoomTo, applyActive, measureActive]);

  // 데스크탑 마우스 드래그 = 확대(scale>1) 상태에서만 팬. 전체보기(fit)에선 팬 안 하고 화살표/스크롤에 맡긴다.
  // (터치 팬은 별도 touch 핸들러가 처리 — 여기선 마우스만.)
  useEffect(() => {
    if (!open) return;
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
  }, [open, clampActive, scheduleApply, applyActive]);

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
    if (!open) return;
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
            window.setTimeout(() => onClose(), 170);
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
  }, [open, locked, measureActive, clampActive, scheduleApply, resetActive, applyActive, onClose]);

  // 키보드: ← → 전환, Esc 닫기.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") scrollToIndex(Math.max(0, index - 1));
      else if (e.key === "ArrowRight") scrollToIndex(Math.min(images.length - 1, index + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, images.length, scrollToIndex, onClose]);

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

  if (!open || images.length === 0 || typeof document === "undefined") return null;

  // 헤더(.hdr, z-index:300)보다 위에 오도록 body로 portal + z-[400]. 조상 스택 컨텍스트에도 안 갇힌다.
  return createPortal(
    <div ref={overlayRef} className="fixed inset-0 z-[400] flex flex-col bg-[rgba(8,7,12,0.94)]">
      {/* 페이지 카운터 — 본 화면과 통일해 우하단. 여러 장일 때만 노출. */}
      {hasMultiple && (
        <span className="pointer-events-none absolute bottom-3 right-3.5 z-10 rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-semibold text-white tabular-nums">
          {index + 1} / {images.length}
        </span>
      )}
      {/* 닫기 — 항상 잘 보이도록 우상단 고정 원형 버튼(Esc·아래로 당기기로도 닫힌다). */}
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className={`absolute right-3.5 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 ${FOCUS_RING}`}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
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
        {images.map((image, i) => (
          <div key={image.url} className="relative h-full w-full shrink-0 snap-center snap-always overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙(로컬/S3) */}
            <img
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              src={mediaUrl(image.url)}
              alt={`${title} 확대 ${i + 1}`}
              draggable={false}
              onLoad={() => onSlideLoad(i)}
              className="absolute inset-0 h-full w-full select-none object-contain will-change-transform"
            />
          </div>
        ))}
      </div>
      {/* 화살표는 데스크탑(마우스)에서만 — 모바일은 스와이프로 넘긴다.
          끝(첫/마지막 사진)에선 그 방향 화살표를 숨겨 경계임을 알린다. */}
      {hasMultiple && !isTouch && index > 0 && (
        <button
          type="button"
          onClick={() => scrollToIndex(index - 1)}
          aria-label="이전 사진"
          className={`absolute left-3.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 ${FOCUS_RING}`}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}
      {hasMultiple && !isTouch && index < images.length - 1 && (
        <button
          type="button"
          onClick={() => scrollToIndex(index + 1)}
          aria-label="다음 사진"
          className={`absolute right-3.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 ${FOCUS_RING}`}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}
    </div>,
    document.body,
  );
}
