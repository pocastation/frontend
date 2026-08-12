"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";

type Status = "verifying" | "signedUp" | "verified" | "failed" | "missing";

type SignUpConfirmResponse = {
  nickname: string;
  nicknameChanged: boolean;
  requestedNickname: string | null;
};

const PRIMARY =
  "inline-flex h-12 items-center rounded-[4px] bg-primary px-7 text-[14.5px] font-bold text-white transition-colors hover:bg-primary-dark";
const SECONDARY =
  "inline-flex h-12 items-center rounded-[4px] border border-border-2 px-6 text-[14px] font-bold text-text-1 transition-colors hover:border-primary hover:text-primary";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { accessToken, refresh } = useAuth();
  const [status, setStatus] = useState<Status>(token ? "verifying" : "missing");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<SignUpConfirmResponse | null>(null);
  // 가입 직후 본인인증으로 이을지 판단한다(#321). 게이트가 꺼져 있으면 인증을 완료할 수단이
  // 없으므로 안내하지 않는다 — 누르면 아무것도 못 하는 화면으로 보내게 된다.
  const [identityNeeded, setIdentityNeeded] = useState(false);
  // React 18 StrictMode의 개발 모드 이중 실행에서 같은 토큰을 두 번 보내면, 두 번째 호출이
  // "이미 사용된 링크"로 실패해 성공 화면 대신 실패 화면이 뜬다(토큰이 1회용이라 그렇다).
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!token || attemptedRef.current) {
      return;
    }
    attemptedRef.current = true;
    (async () => {
      // 같은 링크 주소를 두 흐름이 쓴다.
      //  ① 인증 후 가입(BE #252) — 이 요청이 통과해야 회원이 만들어진다
      //  ② 전환 이전에 가입한 미인증 회원의 이메일 인증
      // 대기 행 토큰인지 회원 토큰인지는 서버만 아니까, 신규 흐름을 먼저 시도하고 아니면 기존으로 간다.
      try {
        const result = await apiFetch<SignUpConfirmResponse>("/api/auth/signup/confirm", {
          method: "POST",
          body: { token },
        });
        setConfirmed(result);
        setStatus("signedUp");
        // confirm 응답이 리프레시 쿠키를 심어준다 — 그걸로 세션을 집어오면 곧바로 로그인 상태가 된다.
        // 링크를 눌러 가입이 끝났는데 다시 로그인 화면으로 보내면 방금 정한 비밀번호를 또 쳐야 한다.
        const issued = await refresh();
        if (issued) {
          try {
            const identity = await apiFetch<{ verified: boolean; required: boolean }>(
              "/api/members/me/identity-verification",
              { accessToken: issued },
            );
            setIdentityNeeded(identity.required && !identity.verified);
          } catch {
            // 조회에 실패하면 안내하지 않는다. 가입 마지막 화면이 부가 조회 하나로 흔들리면 안 된다.
          }
        }
        return;
      } catch (err) {
        // 대기 행 토큰이 아니었을 뿐일 수 있다 — 기존 회원 인증으로 한 번 더 시도한다.
        if (!(err instanceof ApiError) || err.status >= 500) {
          setStatus("failed");
          setMessage("인증에 실패했어요. 잠시 후 다시 시도해 주세요.");
          return;
        }
      }

      try {
        await apiFetch<void>("/api/auth/email-verification/confirm", {
          method: "POST",
          body: { token },
        });
        setStatus("verified");
        if (accessToken) {
          await refresh();
        }
      } catch (err) {
        setStatus("failed");
        setMessage(
          err instanceof ApiError ? err.message : "인증에 실패했어요. 잠시 후 다시 시도해 주세요.",
        );
      }
    })();
  }, [token, accessToken, refresh]);

  return (
    <div className="mx-auto max-w-[420px] px-5 pt-14 pb-16">
      {status === "verifying" && (
        <>
          <h1 className="font-display text-[22px] font-extrabold tracking-[-0.03em] text-text-1">
            확인하는 중이에요
          </h1>
          <p aria-live="polite" className="mt-2 text-[13.5px] text-text-3">
            잠시만 기다려 주세요.
          </p>
        </>
      )}

      {status === "missing" && (
        <>
          <h1 className="font-display text-[22px] font-extrabold tracking-[-0.03em] text-text-1">
            인증 정보가 없어요
          </h1>
          <p role="alert" className="mt-2 text-[13.5px] leading-[1.75] text-text-2">
            주소에 인증 정보가 담겨 있지 않아요. 메일의 버튼을 다시 눌러 주세요.
          </p>
        </>
      )}

      {status === "signedUp" && confirmed && (
        <>
          <p className="text-[11px] font-extrabold tracking-[0.08em] text-primary">가입 완료</p>
          <h1 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.035em] text-text-1">
            환영해요, {confirmed.nickname}님
          </h1>
          <p className="mt-3 text-[13.5px] leading-[1.8] text-text-2">
            {identityNeeded
              ? "이메일 인증이 끝나 바로 로그인됐어요. 마지막으로 휴대폰 본인인증만 마치면 돼요."
              : "인증이 끝나 바로 로그인됐어요. 이제 입찰 · 구매 · 판매를 시작할 수 있어요."}
          </p>

          {/* 조용히 바꿔놓으면 나중에 "내 닉네임이 왜 이래"가 된다. 이건 진짜 알려야 하는 사실이라
              helper가 아니라 좌측 규칙선으로 세운다. */}
          {confirmed.nicknameChanged && (
            <p className="mt-5 border-l-[3px] border-accent pl-4 text-[13px] leading-[1.75] text-text-2">
              <b className="font-extrabold text-text-1">
                닉네임이 {confirmed.nickname}으로 정해졌어요.
              </b>{" "}
              인증하시는 사이에 {confirmed.requestedNickname}을 다른 분이 먼저 쓰게 됐어요.
              마이페이지에서 원하는 닉네임으로 바꾸실 수 있어요.
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {/* 가입을 마치는 마지막 단계가 본인인증이다(#321). 환영 화면을 건너뛰고 자동으로
                넘기지 않는 이유는 닉네임이 바뀐 경우 그 고지를 반드시 보여줘야 하기 때문이다. */}
            {identityNeeded ? (
              <Link
                href="/onboarding/identity?next=%2F"
                className={`${PRIMARY} ${FOCUS_RING}`}
              >
                본인인증하고 시작하기
              </Link>
            ) : (
              <Link href="/" className={`${PRIMARY} ${FOCUS_RING}`}>
                둘러보러 가기
              </Link>
            )}
            {confirmed.nicknameChanged && (
              <Link href="/mypage" className={`${SECONDARY} ${FOCUS_RING}`}>
                닉네임 바꾸기
              </Link>
            )}
          </div>
        </>
      )}

      {status === "verified" && (
        <>
          <p className="text-[11px] font-extrabold tracking-[0.08em] text-primary">인증 완료</p>
          <h1 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.035em] text-text-1">
            이메일 인증이 끝났어요
          </h1>
          <p aria-live="polite" className="mt-3 text-[13.5px] leading-[1.8] text-text-2">
            이제 입찰 · 구매 · 판매를 시작할 수 있어요.
          </p>
          <div className="mt-7">
            <Link href="/" className={`${PRIMARY} ${FOCUS_RING}`}>
              둘러보러 가기
            </Link>
          </div>
        </>
      )}

      {status === "failed" && (
        <>
          <h1 className="font-display text-[22px] font-extrabold tracking-[-0.03em] text-text-1">
            링크를 확인할 수 없어요
          </h1>
          <p role="alert" className="mt-2 text-[13.5px] leading-[1.75] text-text-2">
            {message}
          </p>
          <p className="mt-4 text-[12.5px] leading-[1.7] text-text-3">
            링크는 24시간 동안만 쓸 수 있고, 한 번 쓰면 다시 쓸 수 없어요. 새로 가입하거나, 이미
            가입하셨다면 로그인 화면에서 인증 메일을 다시 받을 수 있어요.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/signup" className={`${PRIMARY} ${FOCUS_RING}`}>
              다시 가입하기
            </Link>
            <Link href="/login" className={`${SECONDARY} ${FOCUS_RING}`}>
              로그인 화면으로
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// useSearchParams()는 Suspense 경계 안에서만 쓸 수 있다(빌드 시 정적 최적화 요구사항).
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[420px] px-5 py-24 text-sm text-text-3">불러오는 중...</div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
