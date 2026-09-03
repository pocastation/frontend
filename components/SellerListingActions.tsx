"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW } from "@/lib/format";
import { MIN_LISTING_PRICE, PRICE_UNIT } from "@/lib/fees";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionSaleType } from "@/lib/types";

/**
 * 매물 상세의 판매자 액션 — 가격 수정 · 내리기(#533).
 *
 * <p>예전에는 둘 다 <b>마이페이지 「판매 중인 매물」 탭에만</b> 있었다. 자기 매물 상세를 열면
 * 제안판매는 제안 목록만 보이고, 즉시판매는 「내 상품은 구매할 수 없어요」 한 줄로 끝나
 * <b>할 수 있는 게 아무것도 없었다</b>.
 *
 * <p>🔴 <b>구매자 바(#480·#484)의 어휘를 그대로 쓴다.</b> 같은 성격의 행동이 화면마다 다르게
 * 보이면 안 된다 — 구매자의 「취소하기 | 금액 바꾸기」가 바로 이 모양이다.
 * <ul>
 *   <li>파괴적 행동(내리기) = <b>좁은 보조</b>(96px · 얇은 테두리 · 회색 글자)</li>
 *   <li>주 행동(가격 수정) = <b>넓은 잉크 아웃라인</b>(flex-1 · 1.5px)</li>
 *   <li><b>빨강은 쓰지 않는다.</b> 구매자의 「취소하기」도 회색이다 — 색이 아니라 폭과 무게로 말한다</li>
 * </ul>
 * 가격 수정이 잠기면 버튼이 사라지고 내리기가 폭만 넓어진다. 무게는 그대로다.
 *
 * <p>연장은 여기 없다. 상세 응답에 {@code nextExtensionDays}·{@code extendableFrom}이 없어
 * 「언제부터 며칠 느는지」를 화면이 알 수 없다 — 연장은 마이페이지가 계속 맡는다.
 */
export default function SellerListingActions({
  auctionId,
  saleType,
  price,
  offerCount,
  viewport,
  onChanged,
}: {
  auctionId: number;
  saleType: AuctionSaleType;
  /** 현재 등록가 — 제안판매는 최소 제안가, 즉시판매는 판매가. 수정 팝업의 초기값이다. */
  price: number;
  /** 살아 있는 제안 수. 제안판매의 가격 잠금 판정 근거(§1.1). */
  offerCount: number;
  viewport: "desktop" | "mobile";
  /** 성공 후 화면을 새로고침할 방법 — 페이지마다 다르다(라우터 refresh / 재조회). */
  onChanged: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInstant = saleType === "INSTANT";
  // 🔴 잠금은 제안판매에만. 즉시판매엔 제안이라는 게 없고, 팔리면 매물이 LIVE를 벗어나
  //    이 컴포넌트가 아예 렌더되지 않는다(backend#420과 같은 판단).
  const priceLocked = !isInstant && offerCount > 0;
  const priceLabel = isInstant ? "판매가" : "최소 제안가";

  async function withdraw() {
    const warning =
      offerCount > 0
        ? `판매글을 내릴까요? 받은 제안 ${offerCount}건이 모두 사라지고, 되돌릴 수 없어요.`
        : "판매글을 내릴까요? 내린 뒤에는 되돌릴 수 없고, 다시 팔려면 새로 등록해야 해요.";
    if (!window.confirm(warning)) return;
    setBusy(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/withdraw`, { method: "POST" });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const height = viewport === "desktop" ? "h-12" : "h-11";
  const radius = viewport === "desktop" ? "rounded-r2" : "rounded-[7px]";
  const subClass = `flex ${height} w-[96px] flex-shrink-0 items-center justify-center ${radius} border border-border-2 bg-surface text-[13px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-45 ${FOCUS_RING}`;
  const subWideClass = subClass.replace("w-[96px] flex-shrink-0", "flex-1");
  const mainClass = `flex ${height} flex-1 items-center justify-center ${radius} border-[1.5px] border-text-1 bg-surface ${viewport === "desktop" ? "text-sm" : "text-[13.5px]"} font-extrabold text-text-1 transition-colors hover:bg-surface-2 disabled:opacity-45 ${FOCUS_RING}`;

  return (
    <div className={viewport === "desktop" ? "mt-5 border-t border-border pt-5" : "mt-3.5 border-t border-border pt-3"}>
      {/* 지금 무엇을 할 수 있는지 한 줄로. 잠긴 이유를 말해 주지 않으면 버튼이 왜 없는지 알 수 없다. */}
      <p className="mb-2.5 text-[11.5px] leading-relaxed text-text-3">
        {isInstant ? (
          <>내 매물이에요 · 판매 중에는 언제든 가격을 바꿀 수 있어요</>
        ) : priceLocked ? (
          <>
            내 매물이에요 · <b className="font-bold text-text-1">{offerCount}명</b>이 제안했어요 · 가격은 더 바꿀 수 없어요
          </>
        ) : (
          <>내 매물이에요 · 아직 제안이 없어 가격을 바꿀 수 있어요</>
        )}
      </p>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => void withdraw()} disabled={busy} className={priceLocked ? subWideClass : subClass}>
          내리기
        </button>
        {!priceLocked && (
          <button type="button" onClick={() => setEditOpen(true)} disabled={busy} className={mainClass}>
            가격 수정
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-[11.5px] font-bold text-accent">{error}</p>}

      {editOpen && (
        <PriceEditDialog
          auctionId={auctionId}
          label={priceLabel}
          current={price}
          onClose={() => setEditOpen(false)}
          onDone={() => {
            setEditOpen(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/**
 * 가격 수정 팝업 — 데스크탑 「제안 금액 바꾸기」(#484)와 같은 골격.
 *
 * <p>모바일에서도 같은 팝업을 쓴다. 상세의 판매자 액션은 <b>고정 바 안이나 패널 안</b>에 있어
 * 인라인으로 펼칠 자리가 없고, 시트를 따로 만들면 같은 일을 하는 화면이 둘로 갈린다.
 */
function PriceEditDialog({
  auctionId,
  label,
  current,
  onClose,
  onDone,
}: {
  auctionId: number;
  label: string;
  current: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [value, setValue] = useState(String(current));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const parsed = Number(value);
  // 하한·단위는 서버와 같은 규칙을 화면에서도 미리 본다 — 서버가 최종 판정이라 여기선 버튼만 잠근다.
  const valid = Number.isFinite(parsed) && parsed >= MIN_LISTING_PRICE && parsed % PRICE_UNIT === 0;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/start-price`, {
        method: "PATCH",
        body: { startPrice: parsed },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "바꾸지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-label={`${label} 수정`} aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-text-1/40" />
      <div className="relative w-full max-w-[400px] rounded-t-r4 bg-surface p-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:rounded-r4 sm:pb-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-extrabold text-text-1">{label} 수정</p>
          <button type="button" aria-label="닫기" onClick={onClose} className={`text-text-3 transition-colors hover:text-text-1 ${FOCUS_RING}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-[11.5px] text-text-3">
          지금 {label} <b className="font-display font-bold tabular-nums text-text-2">{formatKRW(current)}</b>
        </p>

        <label className="mt-4 block">
          <span className="text-xs font-bold text-text-2">새 {label}</span>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
            className={`mt-1.5 h-12 w-full rounded-r2 border border-border px-3.5 font-display text-[17px] font-bold tabular-nums text-text-1 outline-none transition-colors focus:border-primary ${FOCUS_RING}`}
          />
        </label>
        <p className="mt-1.5 text-[11px] text-text-3">
          {formatKRW(MIN_LISTING_PRICE)} 이상 · {PRICE_UNIT.toLocaleString()}원 단위
        </p>

        {error && <p className="mt-2.5 text-[12px] font-bold text-accent">{error}</p>}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !valid || parsed === current}
          className={`mt-4 flex h-12 w-full items-center justify-center rounded-r2 bg-primary text-sm font-extrabold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING}`}
        >
          {busy ? "바꾸는 중..." : valid ? `${formatKRW(parsed)}으로 바꾸기` : "금액을 확인해 주세요"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
