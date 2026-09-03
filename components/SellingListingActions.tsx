"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW, hasPassed } from "@/lib/format";
import { MIN_LISTING_PRICE, PRICE_UNIT } from "@/lib/fees";
import { FOCUS_RING } from "@/lib/ui";
import type { MySellingAuctionResponse } from "@/lib/types";

const OUTLINE = `shrink-0 rounded-r2 border border-border-2 bg-surface px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 disabled:opacity-45 disabled:hover:border-border-2 disabled:hover:text-text-2 ${FOCUS_RING}`;

/**
 * 판매 중인 매물의 판매자 행동 — 기간 연장(§1.3·§2.4)과 최소가 수정(§1.1, #434).
 *
 * <p>둘을 한 컴포넌트에 둔 이유는 <b>같은 행에서 서로를 가리기 때문</b>이다. 최소가는 제안이
 * 들어오면 잠기고, 연장은 종료 1일 전에야 열린다 — 따로 두면 한 행에 버튼이 넷까지 늘어난다.
 */
export default function SellingListingActions({
  auction,
  onChanged,
}: {
  auction: MySellingAuctionResponse;
  onChanged: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(auction.startPrice ?? ""));
  const [error, setError] = useState<string | null>(null);

  // 🔴 제안 인원수로 잠금을 판정한다. 「제안이 있어서」보다 「3명이 제안해서」가 납득되고,
  // 무엇보다 서버가 같은 값(살아 있는 제안)으로 판정하므로 화면과 어긋나지 않는다.
  const offerCount = auction.offerCount ?? 0;
  // 🔴 즉시판매는 제안이라는 게 없어 잠기지 않는다(#533·backend#420). 연장도 대상이 아니다 —
  // 기간이 없기 때문이다. 유형 분기를 여기서 하고, 바깥(마이페이지)은 유형을 보지 않는다.
  const isInstant = auction.saleType === "INSTANT";
  const priceLocked = !isInstant && offerCount > 0;
  const priceLabel = isInstant ? "판매가" : "최소가";

  // 연장은 서버가 열어 주는 시각(종료 1일 전)과 남은 횟수로 갈린다. 둘 다 서버가 계산해
  // 내려준다 — 화면이 「1일 전」과 「+7 → +3」을 다시 세면 규칙이 바뀔 때 갈린다(BE #399).
  const exhausted = auction.nextExtensionDays == null;
  const tooEarly = !exhausted && auction.extendableFrom != null && !hasPassed(auction.extendableFrom);

  async function run(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await fetchWithAuth<void>(path, body === undefined ? { method: "POST" } : { method: "PATCH", body });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2.5 pl-[56px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-text-3">
          {isInstant ? (
            <>판매 중에는 언제든 가격을 바꿀 수 있어요</>
          ) : exhausted ? (
            <>
              연장을 <b className="font-bold text-text-1">모두 사용</b>했어요 · 종료 후 다시 등록할 수 있어요
            </>
          ) : tooEarly ? (
            <>
              종료 <b className="font-bold text-text-1">1일 전</b>부터 연장할 수 있어요
            </>
          ) : priceLocked ? (
            <>
              <b className="font-bold text-text-1">{offerCount}명</b>이 제안했어요 · 최소가는 더 바꿀 수 없어요
            </>
          ) : (
            <>
              아직 제안이 없어요 · 최소가를 바꿀 수 있어요
            </>
          )}
        </span>

        {/* 최소가는 제안이 하나라도 오면 버튼째 사라진다 — 눌리지 않는 버튼을 남기지 않는다. */}
        {!priceLocked && !editing && (
          <button type="button" onClick={() => setEditing(true)} disabled={busy} className={OUTLINE}>
            {priceLabel} 수정
          </button>
        )}

        {/* 🔴 이른 경우는 흐리게 두고, 소진한 경우는 아예 없앤다. 전자는 「기다리면 된다」이고
            후자는 「이 매물에선 끝났다」 — 다른 사실이라 형태도 달라야 한다. */}
        {/* 연장은 제안판매 전용 — 즉시판매는 기간 자체가 없다(#533). */}
        {!isInstant && !exhausted && (
          <button
            type="button"
            onClick={() => void run(`/api/auctions/${auction.id}/extend`)}
            disabled={busy || tooEarly}
            className={OUTLINE}
            title={tooEarly ? "종료 1일 전부터 연장할 수 있어요" : undefined}
          >
            {auction.nextExtensionDays}일 연장
          </button>
        )}

        {/* 자진 내리기(정책 제6조 ②, #472) — 결제 절차가 시작되면(MATCHED) 이 행 자체가
            판매 중 목록에서 빠지므로, 여기 보이는 매물은 항상 내릴 수 있는 상태다.
            받은 제안이 전부 실효되는 되돌릴 수 없는 행동이라 confirm으로 한 번 되묻는다. */}
        <button
          type="button"
          onClick={() => {
            const warning =
              offerCount > 0
                ? `판매글을 내릴까요? 받은 제안 ${offerCount}건이 모두 사라지고, 되돌릴 수 없어요.`
                : "판매글을 내릴까요? 내린 뒤에는 되돌릴 수 없고, 다시 팔려면 새로 등록해야 해요.";
            if (!window.confirm(warning)) return;
            void run(`/api/auctions/${auction.id}/withdraw`);
          }}
          disabled={busy}
          className={OUTLINE}
        >
          내리기
        </button>
      </div>

      {editing && (
        <div className="mt-2.5">
          <div className="flex items-center gap-2">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              aria-label="최소 제안가"
              className={`h-[38px] w-full max-w-[190px] rounded-r2 border border-border px-3 font-display text-[15px] font-bold tabular-nums text-text-1 outline-none transition-colors focus:border-primary ${FOCUS_RING}`}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(`/api/auctions/${auction.id}/start-price`, { startPrice: Number(price) })}
              className={`shrink-0 rounded-r2 bg-text-1 px-3.5 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-text-2 disabled:opacity-60 ${FOCUS_RING}`}
            >
              저장
            </button>
            <button type="button" disabled={busy} onClick={() => setEditing(false)} className={OUTLINE}>
              취소
            </button>
          </div>
          {/* 🔴 「하나라도 들어오면 잠긴다」를 미리 말한다. 나중에 눌렀다가 막히면 이유를 알 수 없다. */}
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-3">
            최저 {formatKRW(MIN_LISTING_PRICE)}부터 {PRICE_UNIT.toLocaleString("ko-KR")}원 단위 ·{" "}
            <b className="font-bold text-text-2">제안이 하나라도 들어오면 더는 바꿀 수 없어요.</b>
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[11.5px] font-bold text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
