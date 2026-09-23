"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import type { GuidePhotoShot } from "@/lib/guide-content";
import { FOCUS_RING } from "@/lib/ui";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import styles from "./GuidePhotoExamples.module.css";

export default function GuidePhotoExamples({ shots }: { shots: GuidePhotoShot[] }) {
  const [initialIndex, setInitialIndex] = useState<number | null>(null);

  return (
    <section className="mt-5 max-w-[520px]" aria-label="필수 4컷 예시">
      <div className="mb-[9px] flex items-baseline justify-between gap-3 text-[#77738c]">
        <p className="text-[12.5px]">필수 4컷</p>
        <span className="text-[11px]">사진을 누르면 확대돼요</span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {shots.map((shot, index) => (
          <figure key={shot.src} className="min-w-0">
            <button
              type="button"
              onClick={() => setInitialIndex(index)}
              aria-label={`${shot.label} 사진 확대`}
              aria-haspopup="dialog"
              className={`relative block w-full cursor-zoom-in overflow-hidden border border-border bg-surface-2 hover:border-text-3 ${FOCUS_RING}`}
            >
              <Image src={shot.src} alt={shot.alt} width={1060} height={1484} sizes="(max-width: 639px) 25vw, 123px" className="block aspect-[5/7] h-auto w-full object-cover" />
              <span aria-hidden="true" className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-[3px] bg-white/90 text-text-2 sm:bottom-[5px] sm:right-[5px] sm:size-[23px]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></svg>
              </span>
            </button>
            <figcaption className="pt-[7px] text-[11px] font-bold text-text-2 sm:text-[11.5px]">{shot.label}</figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-[9px] text-[11px] leading-relaxed text-[#77738c]">촬영 방법 설명을 위한 AI 생성 예시입니다.</p>
      {initialIndex !== null && (
        <GuidePhotoViewer shots={shots} initialIndex={initialIndex} onClose={() => setInitialIndex(null)} />
      )}
    </section>
  );
}

// 가이드의 정적 사진은 API 미디어 주소와 분리한다. native dialog로 배경을 비활성화한다.
function GuidePhotoViewer({ shots, initialIndex, onClose }: {
  shots: GuidePhotoShot[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const transform = useRef({ scale: 1, x: 0, y: 0 });
  const pointer = useRef<{ id: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const titleId = useId();
  const shot = shots[index];

  const applyTransform = useCallback(() => {
    const stage = stageRef.current, image = imageRef.current;
    if (!stage || !image) return;
    const value = transform.current;
    const maxX = Math.max(0, (image.offsetWidth * value.scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * value.scale - stage.clientHeight) / 2);
    value.x = Math.max(-maxX, Math.min(maxX, value.x));
    value.y = Math.max(-maxY, Math.min(maxY, value.y));
    image.style.transform = `translate(${value.x}px, ${value.y}px) scale(${value.scale})`;
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    dialog.showModal();
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    window.addEventListener("resize", applyTransform);
    return () => {
      window.removeEventListener("resize", applyTransform);
      document.documentElement.style.overflow = overflow;
      dialog.close();
      trigger?.focus({ preventScroll: true });
    };
  }, [applyTransform]);

  // 브라우저 주소창으로 Tab이 빠지지 않도록 기존 모달과 같은 포커스 순환을 적용한다.
  useDialogFocus(dialogRef, true, onClose);

  function showPhoto(next: number) {
    transform.current = { scale: 1, x: 0, y: 0 };
    pointer.current = null;
    setZoomed(false);
    applyTransform();
    setIndex((next + shots.length) % shots.length);
  }

  function toggleZoom() {
    const scale = transform.current.scale === 1 ? 2 : 1;
    transform.current = { scale, x: 0, y: 0 };
    setZoomed(scale > 1);
    applyTransform();
  }

  function startPointer(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: transform.current.x, startY: transform.current.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId || !zoomed) return;
    transform.current.x = start.startX + event.clientX - start.x;
    transform.current.y = start.startY + event.clientY - start.y;
    applyTransform();
  }

  function endPointer(event: PointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (!zoomed && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) showPhoto(index + (dx < 0 ? 1 : -1));
    pointer.current = null;
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.viewer}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          showPhoto(index + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <div className={styles.top}>
        <div className={styles.title}>
          <h2 id={titleId}>{shot.label}</h2>
          <span className={styles.count} aria-live="polite">{index + 1} / {shots.length}</span>
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.zoom} aria-pressed={zoomed} onClick={toggleZoom}>{zoomed ? "전체 보기" : "2배 확대"}</button>
          <button ref={closeRef} type="button" className={styles.close} aria-label="확대 사진 닫기" onClick={onClose}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
      </div>
      <div
        ref={stageRef}
        className={styles.stage}
        onPointerDown={startPointer}
        onPointerMove={movePointer}
        onPointerUp={endPointer}
        onPointerCancel={() => { pointer.current = null; }}
        onDoubleClick={toggleZoom}
      >
        <Image
          key={shot.src}
          ref={imageRef}
          src={shot.src}
          alt={shot.alt}
          width={1060}
          height={1484}
          unoptimized
          loading="eager"
          draggable={false}
          onLoad={applyTransform}
          className={`${styles.image} ${zoomed ? styles.zoomed : ""}`}
        />
      </div>
      <button type="button" className={`${styles.arrow} ${styles.previous}`} aria-label="이전 사진" onClick={() => showPhoto(index - 1)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
      </button>
      <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="다음 사진" onClick={() => showPhoto(index + 1)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
      </button>
      <div className={styles.bottom}>
        {shots.map((item, i) => (
          <button key={item.src} type="button" className={styles.thumbnail} aria-label={`${item.label} 보기`} aria-current={i === index} onClick={() => showPhoto(i)}>
            <Image src={item.src} alt="" width={39} height={54} sizes="39px" />
          </button>
        ))}
      </div>
    </dialog>
  );
}
