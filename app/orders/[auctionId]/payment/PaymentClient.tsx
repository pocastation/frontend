"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as PortOne from "@portone/browser-sdk/v2";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatRemaining } from "@/lib/countdown";
import { envValue } from "@/lib/env";
import { formatKRW } from "@/lib/format";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type { PaymentWindowPreparation, PaymentWindowResult } from "@/lib/types";

/**
 * 결제를 그만두는 사람이 가고 싶은 곳은 「내가 뭘 사려 했는지 보이는 자리」다(#502).
 *
 * <p>히스토리 뒤로를 쓰지 않는 이유가 있다 — 이 화면은 구매내역·거래 성사 알림·즉시구매 직후
 * 여러 경로에서 들어오고, **모바일 결제창은 iframe이 아니라 페이지 이동**이라 결제를 마치고
 * 돌아온 뒤의 히스토리가 엉뚱한 곳을 가리킨다.
 */
const BACK_HREF = "/mypage?tab=purchases";

/**
 * PG가 준 실패 메시지를 화면에 낼 문장으로 다듬는다(#505).
 *
 * <p><b>{@code null}을 돌려주면 「아무것도 보여주지 않는다」는 뜻이다.</b>
 *
 * <p>오류 노출 정책(2026-08-15)은 「PG가 준 메시지는 사용자용으로 설계된 문장이니 그대로
 * 보여준다」였는데, 실제 갤럭시아 메시지는 <b>{@code [1111, 00] 사용자 결제취소}</b>처럼 내부 코드가
 * 접두어로 붙어 온다. 구매자에게 아무 의미가 없는 숫자라 벗겨 낸다 — 정책을 바꾸는 것이 아니라
 * 「사용자용 문장」이라는 전제가 실제와 달랐던 부분을 메우는 것이다.
 *
 * <p>그리고 <b>사용자가 스스로 취소한 것은 오류가 아니다.</b> 빨간 규칙선으로 경고하면 자기가
 * 취소해 놓고 「뭐가 잘못됐나」를 읽게 된다. 취소에는 조치할 것이 없고 화면도 그대로라 다시 누르면
 * 된다 — 조용히 넘긴다.
 *
 * <p>⚠️ 취소 판정을 문구로 하는 것은 PG가 갤럭시아 하나뿐이라 가능한 방식이다(A안). PG가 늘면
 * 코드 기준으로 옮겨야 한다.
 */
function humanizePaymentFailure(message: string | null | undefined): string | null {
  // 「[1111, 00] 사용자 결제취소」 → 「사용자 결제취소」
  const text = (message ?? "").replace(/^\[[^\]]*\]\s*/, "").trim();
  if (/취소/.test(text)) return null;
  return text || "결제가 완료되지 않았어요.";
}

// ⚠️ envValue로 감싸는 이유는 lib/env.ts 참고 — 붙여넣기에 섞인 공백 하나로 결제가 통째로
// 막힌 적이 있다(2026-08-15, 채널키 앞 탭 문자).
const STORE_ID = envValue(process.env.NEXT_PUBLIC_PORTONE_STORE_ID);
const CHANNEL_KEY = envValue(process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY);

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
        // PG가 실패 사유를 준 경우. 내부 코드를 벗기고, 사용자 취소면 아무것도 띄우지 않는다(#505).
        setError(humanizePaymentFailure(params.get("message")));
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

  /**
   * 결제창 호출 실패 사유를 서버에 남긴다(BE #328).
   *
   * 실패는 브라우저에서 일어나 서버에 아무 기록이 남지 않는다. 상세를 사용자에게 보여주지
   * 않기로 했으므로 **이 경로가 원인을 아는 유일한 통로**다.
   *
   * 보고가 실패해도 삼킨다 — 실패를 못 남긴 것 때문에 사용자 흐름까지 막을 이유는 없다.
   */
  async function reportFailure(err: unknown, paymentId: string | null) {
    try {
      const detail =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message ?? "")
          : String(err ?? "");
      await fetchWithAuth(`/api/auctions/${auctionId}/order/payment/failure`, {
        method: "POST",
        body: {
          code: err instanceof ApiError ? `API_${err.status}` : "SDK_THROW",
          message: `${detail}${paymentId ? ` (paymentId=${paymentId})` : ""}`.slice(0, 1000),
        },
      });
    } catch {
      // 보고 실패는 무시한다.
    }
  }

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
    // 실패 보고와 참조 코드에 쓰려고 try 밖에 둔다 — prepare 이후에 실패하면 이 값이 있어야
    // 서버 기록과 사용자가 말한 코드를 맞출 수 있다.
    let paymentId: string | null = null;
    try {
      // 금액·주문명·결제 식별자는 **서버가 정한다.** 프론트가 만들면 결제창 파라미터를 고쳐
      // 싸게 결제하는 경로가 열린다.
      const prep = await fetchWithAuth<PaymentWindowPreparation>(
        `/api/auctions/${auctionId}/order/payment/prepare`,
        { method: "POST" },
      );
      paymentId = prep.paymentId;

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
        // 기한 값은 서버가 준 것을 그대로 쓴다. 약관 제13조의2 ⑤의 「회사가 정한 결제 기한」이라
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

      // 결제창이 정상 동작했고 PG가 거절·취소를 알린 경우다. 잔액 부족처럼 읽으면 다음 행동이
      // 달라지는 사유는 그대로 보여준다 — Stripe가 card_error를 「보여줘도 된다」고 하는 구분이다.
      //
      // 다만 메시지를 손대지 않고 그대로 내면 갤럭시아 내부 코드(`[1111, 00]`)가 딸려 나오고,
      // **사용자가 스스로 취소한 것까지 오류로 보인다**(#505). humanizePaymentFailure가 둘을 거른다.
      if (res?.code !== undefined) {
        setError(humanizePaymentFailure(res.message));
        return;
      }
      setResult(await confirmPayment(prep.paymentId));
    } catch (err) {
      // 🔴 여기 오는 건 결제창 **호출 자체가 실패**한 경우 — 사실상 우리 버그다(파라미터·설정 오류).
      //
      // PG 원문에는 내부 파라미터 구조가 그대로 담긴다(예:
      // `data.virtualAccount.accountExpiry 파라미터는 필수 입력입니다`). 구매자에게는 아무 의미가
      // 없고 우리 구현만 노출하므로 **화면에 내지 않는다.**
      //
      // 대신 상세는 서버로 보낸다 — 실패가 브라우저에서 일어나 서버에는 아무 기록이 남지 않기
      // 때문에, 이걸 안 보내면 원인을 아는 방법이 아예 사라진다(2026-08-15에 실제로 그랬다).
      // 사용자에게는 일반 문구 + 참조 코드(paymentId)만 준다.
      void reportFailure(err, paymentId);
      setError(
        paymentId
          ? `결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요. (오류 코드: ${paymentId})`
          : "결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <>
        <MobilePageHead title="결제" backHref={BACK_HREF} />
        <main className="mx-auto max-w-lg px-[14px] py-16 text-sm text-text-3 sm:px-5">
          결제 정보를 불러오는 중이에요.
        </main>
      </>
    );
  }

  const paid = result?.status === "PAID";
  const issued = result?.accountNumber != null && result.status === "PAYMENT_PENDING";
  // 앱바 제목이 곧 지금 상태다 — 「결제」와 「입금 대기」는 사용자가 해야 할 일이 다르다.
  const title = paid ? "결제 완료" : issued ? "입금 대기" : "결제";

  return (
    <>
      <MobilePageHead title={title} backHref={BACK_HREF} />

      {/*
        하단 고정 바가 본문을 가리지 않도록 모바일에서만 그 높이를 비운다(판매 등록 화면과 같은 처리).
        데스크탑은 고정 바를 쓰지 않으므로 여백도 없다.
      */}
      {/*
        모바일에서 본문이 화면 한 장을 채우게 한다(#505). 결제는 내용이 짧아 그냥 두면 **첫 화면에
        푸터가 올라온다** — 돈을 내는 자리에 사업자 정보와 약관 링크가 함께 보이면 시선이 흩어진다.
        100dvh에서 앱바(48px)를 뺀 값이라 스크롤 없이도 화면이 꽉 찬다.
      */}
      <main className="mx-auto max-w-lg px-[14px] pb-5 pt-4 max-sm:min-h-[calc(100dvh-48px)] max-sm:pb-[132px] sm:px-5 sm:py-10">
        <h1 className="hidden font-display text-xl font-extrabold text-text-1 sm:block">결제</h1>

        {/* 주문 요약 — 카드로 감싸지 않는다. 규칙선과 여백만으로 가른다. */}
        {result ? (
          <div className="border-b border-border pb-4 sm:mt-4 sm:border-t sm:pt-4">
            <p className="truncate text-[13px] text-text-2">{result.orderName}</p>
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span className="text-xs text-text-3">{issued ? "입금할 금액" : "결제 금액"}</span>
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
            previousAttemptFailed={result?.previousAttemptFailed ?? false}
          />
        )}

        {error ? (
          // 진짜 오류만 강조한다 — 좌측 규칙선. 일반 안내는 helper text로 녹인다.
          <p className="mt-5 border-l-2 border-danger pl-3 text-[13px] leading-relaxed text-text-2">{error}</p>
        ) : null}

        {/* 데스크탑 액션 — 모바일은 아래 고정 바가 대신한다. */}
        <div className="mt-8 hidden border-t border-border pt-4 sm:block">
          {paid || issued ? (
            <Link href={BACK_HREF} className={`inline-flex h-9 items-center px-3.5 ${SECONDARY_BUTTON_CLASS}`}>
              구매내역으로
            </Link>
          ) : (
            <button type="button" onClick={handlePay} disabled={busy} className={`h-12 w-full ${PRIMARY_BUTTON_CLASS}`}>
              {busy ? "결제창을 여는 중…" : "결제하기"}
            </button>
          )}
        </div>
      </main>

      {/*
        모바일 하단 고정 바(#502). 결제는 「금액을 확인하고 누르는」 동작이라 금액과 버튼이 늘
        같이 보여야 한다 — 예전에는 스크롤해야 버튼에 닿았다. 매물 상세의 고정 바와 같은 지면이다.
      */}
      <div
        className="fixed inset-x-0 bottom-0 z-[400] border-t border-border bg-white px-[14px] pt-2.5 pb-[calc(10px_+_env(safe-area-inset-bottom))] sm:hidden"
      >
        {paid || issued ? (
          <Link
            href={BACK_HREF}
            className={`flex h-12 w-full items-center justify-center ${SECONDARY_BUTTON_CLASS}`}
          >
            구매내역으로
          </Link>
        ) : (
          <>
            {result ? (
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[11.5px] text-text-3">결제 금액</span>
                <span className="font-display text-[19px] font-extrabold text-text-1 tabular-nums">
                  {formatKRW(result.amount)}
                </span>
              </div>
            ) : null}
            <button type="button" onClick={handlePay} disabled={busy} className={`h-12 w-full ${PRIMARY_BUTTON_CLASS}`}>
              {busy ? "결제창을 여는 중…" : "결제하기"}
            </button>
          </>
        )}
      </div>
    </>
  );
}

// 결제수단 선택 — 이 페이지의 유일한 강조 패널이다(테두리). 나머지 지면은 규칙선·여백으로 가른다.
function MethodChooser({
  method,
  onChange,
  previousAttemptFailed,
}: {
  method: MethodValue;
  onChange: (v: MethodValue) => void;
  previousAttemptFailed: boolean;
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

      {previousAttemptFailed ? (
        <p className="mt-4 border-l-2 border-danger pl-3 text-[13px] leading-relaxed text-text-2">
          지난 결제가 완료되지 않았어요. 다시 시도해 주세요.
        </p>
      ) : null}
    </>
  );
}

/**
 * 계좌번호 복사(#502).
 *
 * <p><b>토스트를 쓰지 않는다.</b> 이 화면은 하단에 고정 바가 있어 토스트가 그 뒤로 깔릴 수 있다 —
 * 오류 토스트가 시트에 가려 사용자가 「눌러도 아무 일도 안 일어난다」고 느낀 전례가 있다(T55).
 * 누른 자리에서 바로 확인되도록 버튼 자체를 2초간 「복사됨」으로 바꾼다.
 */
function CopyAccountButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      // clipboard API는 보안 컨텍스트(https·localhost)에서만 동작한다. 실패하면 조용히 넘기지
      // 않고 «직접 선택해 복사하라»고 말해 준다 — 계좌번호는 못 옮기면 결제가 막히는 값이다.
      await navigator.clipboard.writeText(value);
      setFailed(false);
      setCopied(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={`mt-3 inline-flex h-9 items-center gap-1.5 rounded-r2 border border-border-2 px-3 text-[12px] font-bold text-text-1 transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
      >
        {copied ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
        {copied ? "복사됨" : "계좌번호 복사"}
      </button>
      {/* 버튼 라벨이 바뀌는 것만으로는 스크린리더가 알기 어려워 상태를 따로 알린다. */}
      <span aria-live="polite" className="sr-only">
        {copied ? "계좌번호를 복사했어요." : ""}
      </span>
      {failed ? (
        <p className="mt-2 text-[11.5px] leading-relaxed text-text-3">
          복사가 안 됐어요. 위 번호를 길게 눌러 직접 복사해 주세요.
        </p>
      ) : null}
    </>
  );
}

/**
 * 입금 기한의 남은 시간(#502).
 *
 * <p>「9월 4일 13:27」은 <b>지금이 언제인지 알아야 의미가 생기는</b> 표기다. 기한을 넘기면 거래가
 * 취소되므로 남은 시간을 함께 적는다. 초기값을 null로 두어 서버·클라 첫 렌더를 일치시키는 것은
 * {@code AuctionCountdown}과 같은 이유다(하이드레이션 불일치 방지).
 */
function RemainingTime({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      setLabel(diffMs <= 0 ? "기한 지남" : `${formatRemaining(diffMs)} 남음`);
    };
    update();
    // 기한이 72시간이라 초 단위 카운트다운은 의미가 옅다. 분까지만 그리므로 1분이면 충분하다.
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!label) return null;
  return <span className="text-[11.5px] font-bold text-danger">{label}</span>;
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
        {result.expiresAt ? (
          <Row
            label="입금 기한"
            value={formatDeadline(result.expiresAt)}
            trailing={<RemainingTime expiresAt={result.expiresAt} />}
          />
        ) : null}
      </dl>

      {/* 가상계좌는 「화면을 보며 은행 앱에 숫자를 옮기는」 동작을 반드시 동반한다. 14자리를
          외워서 건너가는 것은 실수하면 돈이 잘못 가는 종류의 불편이라, 복사를 붙인다(#502). */}
      {result.accountNumber ? <CopyAccountButton value={result.accountNumber} /> : null}

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

function Row({
  label,
  value,
  emphasis,
  trailing,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  /** 값 뒤에 덧붙는 것(입금 기한의 남은 시간). 값 자체를 흔들지 않으려고 자리를 나눠 뒀다. */
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3">
      <dt className="shrink-0 text-[13px] text-text-3">{label}</dt>
      <dd className="flex items-baseline gap-2">
        <span
          className={
            emphasis
              ? "font-display text-lg font-extrabold text-text-1 tabular-nums"
              : "text-sm font-semibold text-text-2 tabular-nums"
          }
        >
          {value}
        </span>
        {trailing}
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
