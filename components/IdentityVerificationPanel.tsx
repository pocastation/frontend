"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { PRIMARY_BUTTON_CLASS } from "@/lib/ui";

// 본인인증 패널(#319, #321). 가입 흐름(/onboarding/identity)과 마이페이지가 같은 것을 쓴다 —
// 두 곳에 따로 적으면 "가입 때 본 설명"과 "나중에 보는 설명"이 갈라진다.
//
// **화면을 짧게 유지한다.** 다날이 보내온 예시 자료는 버튼 하나에 가까운 지면이고,
// 우리 초안(#319)은 근거를 세 항목으로 늘어놓아 "왜 이렇게 설명이 많지"로 읽혔다.
// 수집 근거를 아주 없애지는 않는다 — CI는 주민번호 대체 식별자라 무엇을 왜 받는지는
// 화면에 남아야 한다. 한 줄로 줄이고 자세한 것은 처리방침으로 넘긴다.

export type IdentityStatus = { verified: boolean; required: boolean };

/**
 * 대행사 표준창을 띄우는 자리.
 *
 * <p>다날 연동정보(모듈·암호키)를 아직 받지 못해 비어 있다. 계약이 끝나면 여기서 표준창을 열고
 * 대행사가 돌려주는 식별자를 반환하면 된다 — 그 값을 서버에 넘기면 서버가 대행사에 다시 조회해
 * 결과를 확정한다(BE #293). <b>인증 결과를 여기서 만들어 서버로 보내면 안 된다</b>: 위조된 인증이
 * 그대로 저장된다.
 *
 * @returns 대행사 발급 식별자. 연동 전에는 항상 null.
 */
async function openIdentityWindow(): Promise<string | null> {
  return null;
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

  const handleVerify = useCallback(async () => {
    setMessage(null);
    setIsSubmitting(true);
    try {
      const receiptId = await openIdentityWindow();
      // 연동 전에는 여기서 끝난다. 버튼을 비활성으로 두지 않는 이유는 화면이 미완성으로
      // 보이지 않게 하기 위해서고, 누른 사람에게는 사실대로 알린다.
      if (!receiptId) {
        setMessage("본인인증 기능을 준비하고 있어요. 준비되면 알려드릴게요.");
        return;
      }
      const next = await fetchWithAuth<IdentityStatus>("/api/members/me/identity-verification", {
        method: "POST",
        body: { receiptId },
      });
      setStatus(next);
      onVerified?.();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "본인인증을 완료하지 못했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchWithAuth, onVerified]);

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
        생년월일·성별과 본인확인기관이 발급한 식별값을 보관해요. 이름과 휴대폰번호는 저장하지 않아요.{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-text-2">
          개인정보 처리방침
        </Link>
      </p>
    </div>
  );
}
