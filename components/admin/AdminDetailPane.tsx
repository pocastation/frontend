"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { FOCUS_RING } from "@/lib/ui";

/** Desktop side panel, mobile detail screen. The list stays mounted to preserve filters and paging. */
export default function AdminDetailPane({ open, title, onBack, children }: {
  open: boolean;
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const pane = useRef<HTMLElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 1023px)").matches) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      pane.current?.scrollIntoView({ block: "start" });
      back.current?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <aside ref={pane} aria-label={title} className={`admin-detail-pane scroll-mt-16 lg:sticky lg:top-20 lg:self-start ${open ? "" : "hidden lg:block"}`}>
      {open && <button ref={back} type="button" onClick={onBack} className={`mb-3 flex min-h-11 items-center gap-1 text-sm font-bold text-text-2 lg:hidden ${FOCUS_RING}`}>‹ 목록으로</button>}
      {children}
    </aside>
  );
}
