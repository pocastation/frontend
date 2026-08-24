"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  IDENTITY_NOT_READY_MESSAGE,
  openIdentityWindow,
  readRedirectedIdentityResult,
  stripIdentityRedirectParams,
} from "@/lib/identity-verification";
import { PRIMARY_BUTTON_CLASS } from "@/lib/ui";

// 본인인증 패널(#319, #321). 가입 흐름(/onboarding/identity)과 마이페이지가 같은 것을 쓴다 —
// 두 곳에 따로 적으면 "가입 때 본 설명"과 "나중에 보는 설명"이 갈라진다.
//
// **화면을 짧게 유지한다.** 다날이 보내온 예시 자료는 버튼 하나에 가까운 지면이고,
// 우리 초안(#319)은 근거를 세 항목으로 늘어놓아 "왜 이렇게 설명이 많지"로 읽혔다.
// 수집 근거를 아주 없애지는 않는다 — CI는 주민번호 대체 식별자라 무엇을 왜 받는지는
// 화면에 남아야 한다. 한 줄로 줄이고 자세한 것은 처리방침으로 넘긴다.

export type IdentityStatus = { verified: boolean; required: boolean };

const PATH = "/api/members/me/identity-verification";

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  // openIdentityWindow는 PG가 준 사용자용 문구를 그대로 Error에 담아 던진다.
  return err instanceof Error && err.message ? err.message : "본인인증을 완료하지 못했어요.";
}

export default function IdentityVerificationPanel({
  onVerified,
  onStatusLoaded,
  className = "",
}: {
  /** 인증을 마쳤을 때. 가입 흐름은 다음 단계로 보내고, 마이페이지는 아무것도 하지 않는다. */
  onVerified?: () => void;
  /** 상태를 처음 읽었을 때. 가입 흐름이 "건너뛸지"를 판단하는 데 쓴다. */
  onStatusLoaded?: (status: IdentityStatus) => void;
  className?: string;
}) {
  const { accessToken, fetchWithAuth } = useAuth();
  const [status, setStatus] = useState<IdentityStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let cancelled = false;
    void (async () => {
      // 조회에 실패해도 화면은 열어둔다 — 상태를 모른다고 인증 자체를 막을 이유가 없다.
      const fallback: IdentityStatus = { verified: false, required: false };
      let next = fallback;
      try {
        next = await fetchWithAuth<IdentityStatus>("/api/members/me/identity-verification");
      } catch {
        next = fallback;
      }
      if (!cancelled) {
        setStatus(next);
        onStatusLoaded?.(next);
      }
    })();
    return () => {
      cancelled = true;
    };
    // onStatusLoaded는 호출부에서 매 렌더 새로 만들어질 수 있어 의존성에 넣지 않는다.
    // 넣으면 상태 조회가 무한히 반복된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, fetchWithAuth]);

  // 인증 식별자를 서버에 넘겨 결과를 확정받는다. 인증창 경로(promise)와 리다이렉트 복귀 경로가
  // 같은 함수를 쓴다 — 둘 중 하나만 고치면 모바일에서만 깨지는 종류의 버그가 된다.
  const submitReceipt = useCallback(
    async (receiptId: string) => {
      const next = await fetchWithAuth<IdentityStatus>(PATH, {
        method: "POST",
        body: { receiptId },
      });
      setStatus(next);
      onVerified?.();
    },
    [fetchWithAuth, onVerified],
  );

  // 모바일 리다이렉트 복귀. 다날 인증창은 모바일에서 페이지를 떠났다 돌아오므로 promise가 아니라
  // 쿼리스트링으로 결과가 온다.
  const redirectHandled = useRef(false);
  useEffect(() => {
    if (!accessToken || redirectHandled.current) {
      return;
    }
    const url = new URL(window.location.href);
    const result = readRedirectedIdentityResult(url.searchParams);
    if (!result) {
      return;
    }
    redirectHandled.current = true;
    // 파라미터를 **먼저** 지운다. 남겨 두면 새로고침할 때마다 같은 식별자를 다시 보내고,
    // 그 식별자는 이미 선점돼 있어 "이미 사용된 인증 정보"만 반복된다(BE #295).
    window.history.replaceState(null, "", stripIdentityRedirectParams(url));
    // 여기의 setState는 외부 시스템(리다이렉트로 돌아온 URL)을 React 상태로 옮기는 것이라
    // 규칙이 말하는 "파생 상태 계산"이 아니다. redirectHandled 가드로 1회만 실행된다.
    if (result.kind === "failed") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 복귀 URL의 실패 메시지 1회 반영.
      setMessage(result.message);
      return;
    }
    setIsSubmitting(true);
    void submitReceipt(result.receiptId)
      .catch((err) => setMessage(errorText(err)))
      .finally(() => setIsSubmitting(false));
  }, [accessToken, submitReceipt]);

  const handleVerify = useCallback(async () => {
    setMessage(null);
    setIsSubmitting(true);
    try {
      // 모바일은 인증창이 페이지를 갈아치우므로 돌아올 주소를 함께 넘긴다. 지금 주소에 이전
      // 복귀 파라미터가 남아 있을 수 있어 걷어내고 넘긴다.
      const receiptId = await openIdentityWindow(
        stripIdentityRedirectParams(new URL(window.location.href)),
      );
      // 채널 설정이 없으면 여기서 끝난다. 버튼을 비활성으로 두지 않는 이유는 화면이 미완성으로
      // 보이지 않게 하기 위해서고, 누른 사람에게는 사실대로 알린다.
      if (!receiptId) {
        setMessage(IDENTITY_NOT_READY_MESSAGE);
        return;
      }
      await submitReceipt(receiptId);
    } catch (err) {
      setMessage(errorText(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [submitReceipt]);

  if (!status) {
    return <p className={`text-sm text-text-3 ${className}`}>확인하는 중...</p>;
  }

  if (status.verified) {
    return (
      <div className={className}>
        <p className="text-[15px] font-bold text-text-1">본인인증이 완료되었습니다.</p>
        <p className="mt-2 text-xs text-text-3">
          기기나 번호가 바뀌었다면 다시 인증할 수 있어요.
        </p>
        <button
          type="button"
          onClick={handleVerify}
          disabled={isSubmitting}
          className="mt-3 text-xs font-bold text-text-2 underline underline-offset-4 hover:text-text-1"
        >
          다시 인증하기
        </button>
        {message && (
          <p role="status" aria-live="polite" className="mt-2 text-xs text-text-3">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-[13.5px] leading-relaxed text-text-2">
        안전한 거래를 위해 휴대폰으로 본인 명의를 확인해요.
      </p>

      <button
        type="button"
        onClick={handleVerify}
        disabled={isSubmitting}
        className={`mt-5 flex h-12 w-full items-center justify-center px-6 ${PRIMARY_BUTTON_CLASS}`}
      >
        {isSubmitting ? "확인 중..." : "휴대폰 본인인증"}
      </button>

      {message && (
        <p role="status" aria-live="polite" className="mt-3 text-xs text-text-3">
          {message}
        </p>
      )}

      {/* 무엇을 받는지는 화면에 남긴다. CI는 주민번호 대체 식별자라 근거 없이 요구하는
          화면으로 읽히면 안 된다. 자세한 것은 처리방침으로 넘긴다. */}
      <p className="mt-4 text-[11.5px] leading-relaxed text-text-3">
        이름·생년월일·성별·휴대폰번호와 본인확인기관이 발급한 식별값을 보관해요.{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-text-2">
          개인정보 처리방침
        </Link>
      </p>
    </div>
  );
}
