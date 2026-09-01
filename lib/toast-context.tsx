"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

// 앱 전역 토스트 — 인라인 메시지 대신 화면 하단 중앙에 잠깐 떴다 사라지는 피드백.
// 콘텐츠 흐름 밖(fixed)이라 레이아웃을 밀지 않는다. 어느 클라이언트 컴포넌트든 useToast()로 호출한다.
export type ToastVariant = "success" | "warn" | "info" | "danger";

type ToastItem = { id: number; variant: ToastVariant; text: string; sub?: string };

type ToastInput = { variant?: ToastVariant; text: string; sub?: string; duration?: number };

const ToastContext = createContext<{ show: (input: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast는 ToastProvider 안에서만 쓸 수 있어요.");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    ({ variant = "info", text, sub, duration = 3500 }: ToastInput) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, variant, text, sub }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const VARIANT_TEXT: Record<ToastVariant, string> = {
  success: "text-ok",
  warn: "text-warn",
  info: "text-primary",
  danger: "text-danger",
};

function VariantIcon({ variant }: { variant: ToastVariant }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (variant) {
    case "success":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.5 2.5 4.5-5" />
        </svg>
      );
    case "warn":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4.5l2.5 1.5" />
        </svg>
      );
    case "danger":
      return (
        <svg {...common}>
          <path d="M10.3 3.2 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
      );
  }
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div
      // 토스트는 최상위 레이어다(#476) — 게이트 모달(400)·제안 시트(500)·SellerOfferPanel(600)보다
      // 위에 있어야 한다. z-100이던 시절, 실패 시 시트가 열린 채 유지되는 설계와 겹쳐 서버 거부가
      // 전부 「눌렀는데 아무 일도 안 일어남」으로 보였다.
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem_+_var(--mobile-tabbar-h,0px))] z-[700] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === "danger" ? "alert" : "status"}
          className="pointer-events-auto flex w-full max-w-[440px] items-start gap-3 rounded-r3 border border-border bg-surface px-3.5 py-3 shadow-modal animate-[toastIn_0.18s_ease-out]"
        >
          <span className={`mt-px shrink-0 ${VARIANT_TEXT[t.variant]}`}>
            <VariantIcon variant={t.variant} />
          </span>
          <p className="flex-1 text-sm leading-snug text-text-1">
            {t.text}
            {t.sub && <span className="mt-0.5 block text-[13px] text-text-2">{t.sub}</span>}
          </p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="닫기"
            className="shrink-0 text-text-3 transition-colors hover:text-text-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
