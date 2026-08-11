"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { PRIMARY_BUTTON_CLASS } from "@/lib/ui";

// 본인인증 패널(#319). 온보딩 단계(/onboarding/identity)와 마이페이지가 같은 것을 쓴다 —
// 두 곳에 따로 적으면 "가입 때 본 설명"과 "나중에 보는 설명"이 갈라진다.

type Status = { verified: boolean; required: boolean };

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
  className = "",
}: {
  /** 인증을 마쳤을 때 호출. 온보딩은 다음 단계로 보내고, 마이페이지는 아무것도 하지 않는다. */
  onVerified?: () => void;
  className?: string;
}) {
  const { accessToken, fetchWithAuth } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchWithAuth<Status>("/api/members/me/identity-verification");
        if (!cancelled) {
          setStatus(res);
        }
      } catch {
        // 조회에 실패해도 화면은 열어둔다 — 상태를 모른다고 인증 자체를 막을 이유가 없다.
        if (!cancelled) {
          setStatus({ verified: false, required: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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
      const res = await fetchWithAuth<Status>("/api/members/me/identity-verification", {
        method: "POST",
        body: { receiptId },
      });
      setStatus(res);
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
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-text-1">본인인증</h2>
          <StatusBadge tone="ok">인증 완료</StatusBadge>
        </div>
        <p className="mt-2 text-xs text-text-3">
          휴대폰 본인확인을 마쳤어요. 기기나 번호가 바뀌었다면 다시 인증할 수 있어요.
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
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-text-1">본인인증</h2>
        <StatusBadge tone={status.required ? "warn" : "neutral"}>
          {status.required ? "필요" : "미완료"}
        </StatusBadge>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-text-3">
        휴대폰으로 본인 명의를 확인해요.{" "}
        {status.required
          ? "입찰·구매·판매 등록을 하려면 인증이 필요해요."
          : "지금은 인증하지 않아도 서비스를 이용할 수 있어요."}
      </p>

      {/* 근거를 밝힌다 — 이유 없이 주민번호 대체 식별자를 요구하는 화면으로 읽히지 않게. */}
      <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-xs leading-relaxed text-text-2">
        <li>
          <span className="font-bold text-text-1">거래 상대의 신원 확인</span> — 개인 간 거래를
          중개하는 사업자는 판매자의 신원을 확인해야 해요(전자상거래법 제20조의4).
        </li>
        <li>
          <span className="font-bold text-text-1">미성년자 보호</span> — 낙찰은 계약이라, 만 19세
          미만 회원이 취소권을 행사하면 판매자에게 손해가 생겨요.
        </li>
        <li>
          <span className="font-bold text-text-1">부정 이용 차단</span> — 제재를 받은 회원이 탈퇴
          후 다시 가입해 같은 일을 반복하는 것을 막아요.
        </li>
      </ul>

      <p className="mt-4 text-xs text-text-3">
        인증하면 생년월일·성별과 본인확인기관이 발급한 식별값을 보관해요. 이름과 휴대폰번호는
        저장하지 않아요.
      </p>

      <button
        type="button"
        onClick={handleVerify}
        disabled={isSubmitting}
        className={`mt-5 flex h-11 w-full items-center justify-center px-6 ${PRIMARY_BUTTON_CLASS}`}
      >
        {isSubmitting ? "확인 중..." : "휴대폰 본인인증"}
      </button>

      {message && (
        <p role="status" aria-live="polite" className="mt-3 text-xs text-text-3">
          {message}
        </p>
      )}
    </div>
  );
}
