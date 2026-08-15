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
      // 🔁 모바일은 결제창이 iframe이 아니라 **페이지 이동**이라, 결제가 끝나면 PG가
      // redirectUrl로 302를 보내며 결과를 쿼리에 실어 돌려준다. 그 경우 이 화면은 "새로 진입"이
      // 아니라 "결제를 마치고 돌아온" 상태다 — 결과를 이어받아 서버 대사까지 마쳐야 한다.
      // 이걸 안 하면 모바일 사용자는 결제를 끝내고도 화면이 그대로인 것을 본다.
      const params = new URLSearchParams(window.location.search);
      const returnedPaymentId = params.get("paymentId");
      const failCode = params.get("code");

      if (returnedPaymentId || failCode) {
        // 쿼리를 지워 새로고침이 같은 처리를 반복하지 않게 한다.
        window.history.replaceState(null, "", window.location.pathname);
      }
      if (failCode) {
        // PG가 실패 사유를 준 경우 — 뭉개지 않고 그대로 보여준다.
        setError(params.get("message") ?? "결제가 완료되지 않았어요.");
      } else if (returnedPaymentId) {
        setResult(await confirmPayment(returnedPaymentId));
        return;
      }
      setResult(await fetchWithAuth<PaymentWindowResult>(`/api/members/me/orders/${auctionId}/payment`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "결제 정보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
    // confirmPayment는 auctionId·fetchWithAuth에만 의존해 매 렌더 동일하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId, fetchWithAuth]);

  // 🔴 결제창 응답을 근거로 쓰지 않는다. 브라우저에서 오는 값이라 위조가 가능하다 —
  // 서버가 PG에 직접 물어본 결과만 화면에 반영한다. PC(iframe)·모바일(리디렉션) 공용.
  async function confirmPayment(paymentId: string) {
    return fetchWithAuth<PaymentWindowResult>(`/api/auctions/${auctionId}/order/payment/confirm`, {
      method: "POST",
      body: { paymentId },
    });
  }

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
          // customerId를 안 넘기면 포트원이 53자짜리를 자동 생성하는데 갤럭시아 상한이 20자라
          // 거절된다(2026-08-14 실측). 서버가 회원 식별자를 규격에 맞게 줄여 내려준다.
          customerId: prep.customerId,
          fullName: prep.customerName || member?.nickname || "회원",
          ...(prep.customerEmail ? { email: prep.customerEmail } : {}),
        },
        // 가상계좌는 `virtualAccount.accountExpiry`가 **둘 다 필수**다. 2026-08-14 갤럭시아
        // 테스트 채널 실측으로 확인했다 — 객체를 빼면 `data.virtualAccount 파라미터는 필수
        // 입력입니다`, 안을 비우면 `data.virtualAccount.accountExpiry 파라미터는 필수 입력입니다`.
        //
        // ⚠️ SDK 타입 문서는 accountExpiry를 「토스페이먼츠·KG이니시스·NHN KCP에서 지원」이라
        // 적어 갤럭시아가 빠져 있지만 **문서가 낡았다.** 이 실측이 consultation **Q17**(가상계좌
        // 만료 시각을 우리가 지정할 수 있는가)의 답이다 — 지정 가능하며 오히려 필수다.
        //
        // 기한 값은 서버가 준 것을 그대로 쓴다. 약관 제13조의2 ④의 「회사가 정한 기간」이라
        // 정책값이고, 프론트가 정하면 결제창 파라미터를 고쳐 기한을 늘릴 수 있다.
        ...(method === "VIRTUAL_ACCOUNT"
          ? { virtualAccount: { accountExpiry: { validHours: prep.virtualAccountValidHours } } }
          : {}),
        // 🔴 모바일에서 **필수**다. 포트원 갤럭시아 V2 가이드: 「갤럭시아머니트리의 경우 모바일
        // 환경에서 필수 입력」. PC는 iframe으로 떠서 없어도 되지만, 모바일은 페이지가 이동하므로
        // 돌아올 주소가 없으면 결제창 호출 자체가 실패한다.
        //
        // ⚠️ 이걸 빼놓고 데스크톱에서만 검증해 "된다"고 판단했다가 실사용자 모바일 결제가
        // 통째로 막혔다(2026-08-15). 결제 경로는 **반드시 모바일에서도 확인**할 것.
        redirectUrl: `${window.location.origin}/orders/${auctionId}/payment`,
      });

      // 사용자가 창을 닫았거나 PG가 거절 — 이 응답만으로 실패를 단정하지 않고 서버 대사로 넘긴다.
      if (res?.code !== undefined) {
        setError(res.message ?? "결제가 취소됐어요.");
        return;
      }
      setResult(await confirmPayment(prep.paymentId));
    } catch (err) {
      // 🔴 PG 오류를 「결제에 실패했어요」로 덮지 않는다.
      //
      // 예전에는 전부 같은 문구로 뭉갰는데, 그 탓에 실사용자 결제 실패의 원인을 **알 방법이
      // 없었다**(서버 로그에도 남지 않는다 — 실패가 브라우저에서 일어나기 때문이다).
      // 개발 중에는 fetch를 가로채 원문을 봤지만 운영에서는 쓸 수 없는 방법이다.
      // PG가 준 문장을 그대로 보여줘야 사용자가 그걸 전달해 원인을 특정할 수 있다.
      setError(pgErrorMessage(err));
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

/**
 * 결제 실패 사유를 사람이 읽을 문장으로 만든다.
 *
 * <p>포트원 SDK는 실패를 두 가지 방식으로 알린다 — 응답의 {@code code}/{@code message}로 주기도
 * 하고, 파라미터가 규격에 안 맞으면 **throw** 한다. 던져지는 값도 보통 {@code message}를 갖고
 * 있어서 그걸 꺼내 쓴다(예: `data.virtualAccount.accountExpiry 파라미터는 필수 입력입니다`).
 */
function pgErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "결제에 실패했어요. 잠시 후 다시 시도해 주세요.";
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
        {/* 예금주는 PG가 안 주는 경우가 있다(갤럭시아 가상계좌 실응답에 remitteeName이 없다).
            빈 행을 "-"로 남기면 값이 누락된 것처럼 보이므로 아예 감춘다. */}
        {result.holder ? <Row label="예금주" value={result.holder} /> : null}
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
