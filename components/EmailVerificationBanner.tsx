"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ApiError } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";

// 인증 흐름 자체를 다루는 화면에서는 배너를 숨긴다 — 인증 결과 화면 위에 "인증해 주세요" 띠가
// 같이 떠 있으면 방금 성공했는지 아닌지가 헷갈린다.
const HIDDEN_PREFIXES = ["/auth/", "/login", "/signup", "/onboarding/"];

export default function EmailVerificationBanner() {
  const pathname = usePathname();
  const { member, fetchWithAuth, refresh } = useAuth();
  const { show } = useToast();
  const [isSending, setIsSending] = useState(false);

  // emailVerified가 undefined인 경우(구버전 응답·아직 /me를 못 읽은 상태)는 띄우지 않는다.
  // 확실하지 않을 때 경고를 띄우면 멀쩡한 회원에게 거짓 안내가 나간다.
  if (!member || member.emailVerified !== false) {
    return null;
  }
  if (HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return null;
  }

  async function handleResend() {
    setIsSending(true);
    try {
      await fetchWithAuth<void>("/api/members/me/email-verification/resend", { method: "POST" });
      show({ variant: "success", text: "인증 메일을 다시 보냈어요", sub: "메일함을 확인해 주세요" });
      // 다른 창에서 이미 인증을 마쳤다면 서버가 409를 준다 — 그 경우도 상태를 새로 읽어 배너를 정리한다.
      await refresh();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "발송에 실패했어요. 잠시 후 다시 시도해 주세요.";
      show({ variant: "warn", text: message });
      if (err instanceof ApiError && err.errorCode === "EMAIL_ALREADY_VERIFIED") {
        await refresh();
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="border-b border-border bg-surface-2">
      <div className="mx-auto flex max-w-[1160px] items-center gap-3 px-4 py-2.5">
        {/* 도트 인디케이터 — 파스텔 필 배지 대신 이 코드베이스의 절제된 톤을 따른다. */}
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        <p className="flex-1 text-xs leading-relaxed text-text-2">
          이메일 인증이 아직이에요.{" "}
          <span className="text-text-3">
            {/* 서버 게이트가 꺼져 있는데 "인증해야 거래할 수 있다"고 쓰면 켜지지도 않은 제한을
                예고하는 거짓 안내가 된다. 문구를 서버 상태(/me)에 맞춘다. */}
            {member.emailVerificationRequired
              ? "인증을 마쳐야 입찰·구매·판매를 이용할 수 있어요."
              : "가입할 때 받은 메일에서 인증을 완료해 주세요."}
          </span>
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={isSending}
          className={`shrink-0 rounded-full border border-border-2 bg-white px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
        >
          {isSending ? "보내는 중..." : "메일 다시 받기"}
        </button>
      </div>
    </div>
  );
}
