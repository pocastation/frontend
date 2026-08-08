"use client";

import { useCallback, useEffect, useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getCardBrandStyle } from "@/lib/cardBrand";
import { formatCardNumber } from "@/lib/cardNumber";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type { PaymentMethod } from "@/lib/types";

const MAX_METHODS = 3;
const PATH = "/api/members/me/payment-methods";
const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "";
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? "";

// 결제수단(카드 빌링키) 관리 — §7 "카드 사전등록 → 낙찰 자동결제"의 사전등록 UI. 회원당 최대
// MAX_METHODS장, 기본카드가 청구 대상(#152). 포트원 SDK(결제창)로 빌링키를 발급받아 백엔드에
// 등록한다. 카드번호는 우리 서버·프론트 어디에도 원문이 남지 않는다(PG 결제창에서만 입력,
// 표시는 PG가 내려준 마스킹 값).
// 현재 채널(토스)은 결제창 안에서 본인정보를 직접 받으므로 이름/이메일/휴대폰 사전입력 폼이
// 불필요 — 버튼 클릭 즉시 PG 결제창을 연다(닉네임만 fullName 기본값으로 전달).
export default function PaymentMethodManager() {
  const { member, fetchWithAuth } = useAuth();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setMethods(await fetchWithAuth<PaymentMethod[]>(PATH));
    } catch (err) {
      setMessage({ type: "err", text: err instanceof ApiError ? err.message : "결제수단을 불러오지 못했어요." });
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 등록 카드 목록 1회 로드.
    void load();
  }, [load]);

  async function handleRegister() {
    if (!STORE_ID || !CHANNEL_KEY) {
      setMessage({ type: "err", text: "결제 설정이 아직 준비되지 않았어요." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      // issueId는 ASCII만 허용 — 시각+난수로 채번.
      const issueId = `issue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const res = await PortOne.requestIssueBillingKey({
        storeId: STORE_ID,
        channelKey: CHANNEL_KEY,
        billingKeyMethod: "CARD",
        issueId,
        issueName: "Pocastation 결제 카드 등록",
        customer: { fullName: member?.nickname || "회원" },
      });
      if (!res || res.code !== undefined) {
        // 사용자가 창을 닫은 경우 등 — PG가 준 메시지를 그대로 보여준다.
        setMessage({ type: "err", text: res?.message ?? "카드 등록이 취소됐어요." });
        return;
      }
      await fetchWithAuth(PATH, { method: "POST", body: { billingKey: res.billingKey } });
      setMessage({ type: "ok", text: "카드가 등록됐어요. 낙찰 시 이 카드로 자동 결제돼요." });
      await load();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof ApiError ? err.message : "카드 등록에 실패했어요. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSetDefault(method: PaymentMethod) {
    setBusy(true);
    setMessage(null);
    try {
      await fetchWithAuth<PaymentMethod>(`${PATH}/${method.id}/default`, { method: "PATCH" });
      await load();
    } catch (err) {
      setMessage({ type: "err", text: err instanceof ApiError ? err.message : "기본카드를 변경하지 못했어요." });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(method: PaymentMethod) {
    if (!window.confirm(`${method.cardName ?? "등록된 카드"} (${method.cardNumber ?? "카드번호 비공개"})를 삭제할까요?`))
      return;
    setBusy(true);
    setMessage(null);
    try {
      await fetchWithAuth<void>(`${PATH}/${method.id}`, { method: "DELETE" });
      setMessage({ type: "ok", text: "카드가 삭제됐어요." });
      await load();
    } catch (err) {
      setMessage({ type: "err", text: err instanceof ApiError ? err.message : "삭제에 실패했어요." });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-text-3">불러오는 중...</p>;
  }

  return (
    <div className="max-w-md">
      {message && (
        <p
          role={message.type === "err" ? "alert" : "status"}
          className={`mb-4 rounded-r2 px-4 py-3 text-sm font-semibold ${
            message.type === "err" ? "bg-accent-soft text-accent" : "bg-ok-soft text-ok"
          }`}
        >
          {message.text}
        </p>
      )}

      {methods.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-r3 border border-dashed border-border-2 p-6">
          <p className="text-sm font-bold text-text-2">등록된 카드가 없어요.</p>
          <p className="text-xs text-text-3">
            경매 낙찰 시 자동 결제에 사용할 카드를 미리 등록해 두세요. 카드번호는 결제사(PG) 창에서만
            입력되고 서버에 저장되지 않아요.
          </p>
          <button
            type="button"
            onClick={handleRegister}
            disabled={busy}
            className={`px-5 py-2.5 disabled:opacity-50 ${PRIMARY_BUTTON_CLASS}`}
          >
            {busy ? "진행 중..." : "카드 등록하기"}
          </button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {methods.map((method) => (
              <li key={method.id}>
                <CardVisual method={method} />
                <div className="mt-2.5 flex items-center gap-2">
                  {!method.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(method)}
                      disabled={busy}
                      className={`px-3 py-1.5 text-xs disabled:opacity-50 ${SECONDARY_BUTTON_CLASS}`}
                    >
                      기본으로 설정
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(method)}
                    disabled={busy}
                    className={`px-3 py-1.5 text-xs font-bold text-text-3 transition-colors hover:text-accent disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-text-3">
              {methods.length}/{MAX_METHODS}장 등록됨
            </p>
            <button
              type="button"
              onClick={handleRegister}
              disabled={busy || methods.length >= MAX_METHODS}
              className={`px-4 py-2 text-sm disabled:opacity-50 ${SECONDARY_BUTTON_CLASS}`}
            >
              {busy ? "진행 중..." : "카드 추가"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// 카드사 브랜드컬러 그라디언트 + 카드사명 텍스트로 "한눈에 구분되는" 카드 시각화(§lib/cardBrand).
// 실제 카드 이미지가 아니라 CSS 그라디언트라 카드사가 늘어나도 자산 추가 없이 대응된다.
function CardVisual({ method }: { method: PaymentMethod }) {
  const style = getCardBrandStyle(method.cardName);
  return (
    <div
      className="relative flex h-40 w-full flex-col justify-between rounded-r3 p-5"
      style={{ backgroundImage: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-extrabold tracking-tight" style={{ color: style.text }}>
          {method.cardName ?? "등록된 카드"}
        </span>
        {method.isDefault && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: style.text }}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            기본
          </span>
        )}
      </div>
      {/* EMV 칩 느낌의 최소 장식 — 이미지 자산 없이 CSS만으로 "카드처럼" 보이게 한다. */}
      <div className="h-6 w-8 rounded-[4px] bg-white/25" />
      <p className="font-mono text-[15px] tracking-[0.08em] tabular-nums" style={{ color: style.text }}>
        {method.cardNumber ? formatCardNumber(method.cardNumber) : "•••• •••• •••• ••••"}
      </p>
    </div>
  );
}
