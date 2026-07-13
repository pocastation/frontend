"use client";

import { useCallback, useEffect, useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS } from "@/lib/ui";

type PaymentMethod = { cardName: string | null; cardNumber: string | null; registeredAt: string };

const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "";
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? "";

// 결제수단(카드 빌링키) 관리 — §7 "카드 사전등록 → 낙찰 자동결제"의 사전등록 UI.
// 포트원 SDK(결제창)로 빌링키를 발급받아 백엔드에 등록한다. 카드번호는 우리 서버·프론트 어디에도
// 원문이 남지 않는다(PG 결제창에서만 입력, 표시는 PG가 내려준 마스킹 값).
// 이름/이메일/휴대폰은 KG이니시스 PC 발급창 필수값이라 PG 전달용으로만 받고 저장하지 않는다.
export default function PaymentMethodManager() {
  const { member, fetchWithAuth } = useAuth();

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setMethod(await fetchWithAuth<PaymentMethod>("/api/members/me/payment-method"));
    } catch (err) {
      // 404 = 아직 미등록(정상 상태).
      if (err instanceof ApiError && err.status === 404) setMethod(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 등록 카드 1회 로드.
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
        customer: {
          fullName: fullName || member?.nickname || "회원",
          email,
          phoneNumber: phone.replaceAll("-", ""),
        },
      });
      if (!res || res.code !== undefined) {
        // 사용자가 창을 닫은 경우 등 — PG가 준 메시지를 그대로 보여준다.
        setMessage({ type: "err", text: res?.message ?? "카드 등록이 취소됐어요." });
        return;
      }
      await fetchWithAuth("/api/members/me/payment-method", {
        method: "POST",
        body: { billingKey: res.billingKey },
      });
      setFormOpen(false);
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

  async function handleDelete() {
    if (!window.confirm("등록된 카드를 삭제할까요? 입찰하려면 카드를 다시 등록해야 해요.")) return;
    setBusy(true);
    setMessage(null);
    try {
      await fetchWithAuth("/api/members/me/payment-method", { method: "DELETE" });
      setMethod(null);
      setMessage({ type: "ok", text: "카드가 삭제됐어요." });
    } catch (err) {
      setMessage({ type: "err", text: err instanceof ApiError ? err.message : "삭제에 실패했어요." });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-text-3">불러오는 중...</p>;
  }

  const inputClass = `h-11 w-full rounded-r2 border border-border-2 bg-white px-3.5 text-sm text-text-1 placeholder:text-text-3 focus:border-primary focus:outline-none ${FOCUS_RING}`;

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

      {method ? (
        <div className="rounded-r3 border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-1">{method.cardName ?? "등록된 카드"}</p>
              <p className="mt-1 text-sm tabular-nums text-text-2">{method.cardNumber ?? "카드번호 비공개"}</p>
              <p className="mt-2 text-[11px] text-text-3">낙찰 시 이 카드로 자동 결제돼요.</p>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className={`shrink-0 rounded-full border border-border-2 bg-white px-3.5 py-1.5 text-xs font-bold text-text-2 transition-colors hover:border-accent hover:text-accent disabled:opacity-50 ${FOCUS_RING}`}
            >
              삭제
            </button>
          </div>
        </div>
      ) : !formOpen ? (
        <div className="flex flex-col items-start gap-3 rounded-r3 border border-dashed border-border-2 p-6">
          <p className="text-sm font-bold text-text-2">등록된 카드가 없어요.</p>
          <p className="text-xs text-text-3">
            경매 낙찰 시 자동 결제에 사용할 카드를 미리 등록해 두세요. 카드번호는 결제사(PG) 창에서만
            입력되고 서버에 저장되지 않아요.
          </p>
          <button type="button" onClick={() => setFormOpen(true)} className={PRIMARY_BUTTON_CLASS}>
            카드 등록하기
          </button>
        </div>
      ) : (
        <div className="rounded-r3 border border-border bg-surface p-5">
          <p className="text-sm font-bold text-text-1">카드 등록</p>
          <p className="mt-1 text-xs text-text-3">
            아래 정보는 결제사(KG이니시스) 카드 등록 창에 필요한 값으로, 서버에 저장되지 않아요.
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            <input
              className={inputClass}
              placeholder="이름"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
            <input
              className={inputClass}
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className={inputClass}
              type="tel"
              placeholder="휴대폰 번호 (숫자만)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleRegister}
              disabled={busy || !email || !phone}
              className={`${PRIMARY_BUTTON_CLASS} disabled:opacity-50`}
            >
              {busy ? "진행 중..." : "카드 등록 창 열기"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={busy}
              className={`rounded-full border border-border-2 bg-white px-5 py-2 text-sm font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:opacity-50 ${FOCUS_RING}`}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
