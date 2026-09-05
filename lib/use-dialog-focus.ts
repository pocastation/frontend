"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Trap focus and restore the trigger when a dialog closes. A nested photo viewer owns focus while suspended. */
export function useDialogFocus(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  { canClose = true, suspended = false }: { canClose?: boolean; suspended?: boolean } = {},
) {
  const handlers = useRef({ onClose, canClose, suspended });
  useEffect(() => { handlers.current = { onClose, canClose, suspended }; }, [onClose, canClose, suspended]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), video[controls], [tabindex="0"]',
    ) ?? []).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => (focusable()[0] ?? ref.current)?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (handlers.current.suspended) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (handlers.current.canClose) handlers.current.onClose();
      } else if (event.key === "Tab") {
        const targets = focusable();
        const first = targets[0];
        const last = targets.at(-1);
        if (!first) { event.preventDefault(); ref.current?.focus(); return; }
        if (!ref.current?.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
          event.preventDefault(); (event.shiftKey ? last : first)?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, ref]);
}
