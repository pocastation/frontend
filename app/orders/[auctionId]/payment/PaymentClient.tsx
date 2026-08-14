"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as PortOne from "@portone/browser-sdk/v2";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW } from "@/lib/format";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type { PaymentWindowPreparation, PaymentWindowResult } from "@/lib/types";

const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "";
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? "";

// A안(2026-08-10 확정)의 결제수단은 이 둘뿐이다. **카드는 추가하지 않는다** — 폐기가 아니라
// 보류이며, 통신판매업 신고 완료 후 포트원에 결제수단 추가 신청이 가능해지면 그때 되살린다.
const METHODS = [
  {
    value: "VIRTUAL_ACCOUNT",
    label: "가상계좌",
    hint: "전용 계좌를 발급받아 입금해요. 입금이 확인되면 거래가 시작돼요.",
  },
  {
    value: "TRANSFER",
    label: "실시간 계좌이체",
    hint: "은행 인증으로 지금 바로 이체해요.",
  },
] as const;

type MethodValue = (typeof METHODS)[number]["value"];

export default function PaymentClient({ auctionId }: { auctionId: number }) {
  const { member, fetchWithAuth } = useAuth();

  const [result, setResult] = useState<PaymentWindowResult | null>(null);
  const [method, setMethod] = useState<MethodValue>("VIRTUAL_ACCOUNT");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setResult(await fetchWithAuth<PaymentWindowResult>(`/api/members/me/orders/${auctionId}/payment`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "결제 정보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [auctionId, fetchWithAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 진입 시 결제 상태 1회 복원.
    void load();
  }, [load]);

  async function handlePay() {
    if (!STORE_ID || !CHANNEL_KEY) {
      // 채널키 미발급 상태 — 코드 문제가 아니라 설정이 아직 없다는 뜻이라 그대로 말해준다.
      setError("결제 설정이 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 금액·주문명·결제 식별자는 **서버가 정한다.** 프론트가 만들면 결제창 파라미터를 고쳐
      // 싸게 결제하는 경로가 열린다.
      const prep = await fetchWithAuth<PaymentWindowPreparation>(
        `/api/auctions/${auctionId}/order/payment/prepare`,
        { method: "POST" },
      );

      const res = await PortOne.requestPayment({
        storeId: STORE_ID,
        channelKey: CHANNEL_KEY,
        paymentId: prep.paymentId,
        orderName: prep.orderName,
        totalAmount: prep.amount,
        currency: "KRW",
        payMethod: method,
        customer: {
          fullName: prep.customerName || member?.nickname || "회원",
          ...(prep.customerEmail ? { email: prep.customerEmail } : {}),
        },
        // ⚠️ accountExpiry(가상계좌 만료 지정)는 넣지 않는다. SDK 타입 문서상 토스페이먼츠·
        // KG이니시스·NHN KCP만 지원하고 **갤럭시아는 목록에 없다.** 즉 우리 결제 기한과 계좌
        // 유효기간을 맞추지 못할 수 있다(consultation Q17) — 심사 담당자 확인 대기 항목이다.
      });

      // 사용자가 창을 닫았거나 PG가 거절 — 이 응답만으로 실패를 단정하지 않고 서버 대사로 넘긴다.
      if (res?.code !== undefined) {
        setError(res.message ?? "결제가 취소됐어요.");
        return;
      }

      // 🔴 결제창 응답을 근거로 쓰지 않는다. 브라우저에서 오는 값이라 위조가 가능하다 —
      // 서버가 PG에 직접 물어본 결과만 화면에 반영한다.
      const confirmed = await fetchWithAuth<PaymentWindowResult>(
        `/api/auctions/${auctionId}/order/payment/confirm`,
        { method: "POST", body: { paymentId: prep.paymentId } },
      );
      setResult(confirmed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "결제에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-lg px-5 py-16 text-sm text-text-3">결제 정보를 불러오는 중이에요.</main>;
  }

  const paid = result?.status === "PAID";
  const issued = result?.accountNumber != null && result.status === "PAYMENT_PENDING";

  return (
    <main className="mx-auto max-w-lg px-5 py-10">
      <h1 className="font-display text-xl font-extrabold text-text-1">결제</h1>

      {/* 주문 요약 — 카드로 감싸지 않는다. 규칙선과 여백만으로 가른다. */}
      {result ? (
        <div className="mt-4 border-y border-border py-4">
          <p className="truncate text-[13px] text-text-2">{result.orderName}</p>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <span className="text-xs text-text-3">결제 금액</span>
            <span className="font-display text-2xl font-extrabold text-text-1 tabular-nums">
              {formatKRW(result.amount)}
            </span>
          </div>
        </div>
      ) : null}

      {paid ? (
        <PaidNotice />
      ) : issued ? (
        <VirtualAccountNotice result={result} />
      ) : (
        <MethodChooser
          method={method}
          onChange={setMethod}
          onPay={handlePay}
          busy={busy}
          failReason={result?.failReason ?? null}
        />
      )}

      {error ? (
        // 진짜 오류만 강조한다 — 좌측 규칙선. 일반 안내는 helper text로 녹인다.
        <p className="mt-5 border-l-2 border-danger pl-3 text-[13px] leading-relaxed text-text-2">{error}</p>
      ) : null}

      <div className="mt-8 border-t border-border pt-4">
        <Link href="/mypage" className={`inline-flex h-9 items-center px-3.5 ${SECONDARY_BUTTON_CLASS}`}>
          구매내역으로
        </Link>
      </div>
    </main>
  );
}

// 결제수단 선택 — 이 페이지의 유일한 강조 패널이다(테두리). 나머지 지면은 규칙선·여백으로 가른다.
function MethodChooser({
  method,
  onChange,
  onPay,
  busy,
  failReason,
}: {
  method: MethodValue;
  onChange: (v: MethodValue) => void;
  onPay: () => void;
  busy: boolean;
  failReason: string | null;
}) {
  return (
    <>
      <p className="mt-2 text-[13px] leading-relaxed text-text-3">
        입금이 확인되면 판매자에게 발송 요청이 전달돼요.
      </p>

      <fieldset className="mt-6 rounded-r2 border border-border">
        <legend className="sr-only">결제수단</legend>
        {METHODS.map((m, i) => {
          const selected = method === m.value;
          return (
            <label
              key={m.value}
              className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <input
                type="radio"
                name="payMethod"
                value={m.value}
                checked={selected}
                onChange={() => onChange(m.value)}
                className={`mt-0.5 h-4 w-4 accent-primary ${FOCUS_RING}`}
              />
              <span className="min-w-0">
                {/* 선택 상태에만 보라를 쓴다 — 제목·배경에는 쓰지 않는다. */}
                <span className={`block text-sm font-bold ${selected ? "text-primary" : "text-text-1"}`}>
                  {m.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-text-3">{m.hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {failReason ? (
        <p className="mt-4 border-l-2 border-danger pl-3 text-[13px] leading-relaxed text-text-2">
          지난 결제가 완료되지 않았어요. 다시 시도해 주세요.
        </p>
      ) : null}

      <button type="button" onClick={onPay} disabled={busy} className={`mt-6 h-12 w-full ${PRIMARY_BUTTON_CLASS}`}>
        {busy ? "결제창을 여는 중…" : "결제하기"}
      </button>
    </>
  );
}

// 가상계좌 발급 완료 — **결제 완료가 아니다.** 화면도 "입금 대기"로 말해야 한다.
function VirtualAccountNotice({ result }: { result: PaymentWindowResult }) {
  return (
    <>
      <p className="mt-2 text-[13px] leading-relaxed text-text-3">
        아래 계좌로 입금하면 결제가 완료돼요. 입금 전까지는 거래가 시작되지 않아요.
      </p>

      <dl className="mt-6 border-t border-border">
        <Row label="은행" value={result.bank ?? "-"} />
        <Row label="계좌번호" value={result.accountNumber ?? "-"} emphasis />
        <Row label="예금주" value={result.holder ?? "-"} />
        {result.expiresAt ? <Row label="입금 기한" value={formatDeadline(result.expiresAt)} /> : null}
      </dl>

      <p className="mt-5 text-xs leading-relaxed text-text-3">
        입금자명이 달라도 괜찮아요. 발급된 계좌로 들어온 금액으로 확인해요.
      </p>
    </>
  );
}

function PaidNotice() {
  return (
    <>
      <p className="mt-2 text-[13px] leading-relaxed text-text-2">결제가 완료됐어요.</p>
      <p className="mt-1 text-xs leading-relaxed text-text-3">
        판매자에게 발송 요청이 전달됐어요. 진행 상황은 구매내역에서 볼 수 있어요.
      </p>
    </>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3">
      <dt className="shrink-0 text-[13px] text-text-3">{label}</dt>
      <dd
        className={
          emphasis
            ? "font-display text-lg font-extrabold text-text-1 tabular-nums"
            : "text-sm font-semibold text-text-2 tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}

// 시각 표기는 이 레포 관례대로 두 단위·초 없음.
function formatDeadline(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}
