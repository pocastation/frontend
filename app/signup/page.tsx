"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiError, fetchNicknameSuggestion } from "@/lib/api";
import { useGuestOnly } from "@/lib/use-guest-only";
import NicknameSuggestButton from "@/components/NicknameSuggestButton";
import ConsentFields, {
  EMPTY_CONSENTS,
  hasAllRequiredConsents,
  type ConsentValues,
} from "@/components/ConsentFields";
import { FOCUS_RING } from "@/lib/ui";
import {
  PASSWORD_MAX,
  PASSWORD_RULE_TEXT,
  passwordChecks,
  validatePassword,
} from "@/lib/password-policy";

// 입력칸 — 라벨(13px)보다 크고(15px·높이 48px) helper(12px)보다 확실히 앞선다.
// 가입 폼에서 시각적으로 가장 앞에 있어야 하는 건 설명이 아니라 실제로 조작하는 칸이다.
const FIELD =
  "h-12 w-full rounded-[4px] border border-border-2 bg-white px-3.5 text-[15px] text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-primary";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[13px] font-extrabold tracking-[-0.01em] text-text-1">{children}</span>
      {required && (
        <>
          <span aria-hidden="true" className="text-[13px] font-extrabold text-primary">
            *
          </span>
          <span className="sr-only">필수</span>
        </>
      )}
    </span>
  );
}

export default function SignupPage() {
  const { isLoading, isGuest } = useGuestOnly();
  const emailId = useId();
  const passwordId = useId();
  const passwordConfirmId = useId();
  const nicknameId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // 서버로 보내지 않는다 — 오타를 본인이 잡게 하는 화면 장치일 뿐이다.
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  // 추천 닉네임이 도착하기 전 한순간 빈칸이 보인다. 그 사이 플레이스홀더가 "닉네임"이면
  // 사용자가 직접 채워야 하는 칸으로 읽힌다 — 불러오는 중임을 그대로 적는다.
  const [nicknameLoading, setNicknameLoading] = useState(true);
  const [consents, setConsents] = useState<ConsentValues>(EMPTY_CONSENTS);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  // 진입 시 서비스가 생성한 닉네임을 기본값으로 채운다("따뜻한북극여우" 류).
  useEffect(() => {
    let active = true;
    void fetchNicknameSuggestion()
      .then((n) => active && setNickname((prev) => prev || n))
      .catch(() => {})
      .finally(() => active && setNicknameLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const checks = passwordChecks(password);
  const confirmMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // 서버도 같은 규칙으로 막지만, 제출 후 400을 보여주기보다 여기서 먼저 안내한다.
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 달라요.");
      return;
    }
    if (!hasAllRequiredConsents(consents)) {
      setError("필수 항목에 모두 동의해야 가입할 수 있어요.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 이 요청은 회원을 만들지 않는다(BE #252) — 인증 대기와 메일만 남는다.
      await apiFetch("/api/members/signup", {
        method: "POST",
        body: { email, password, nickname, ...consents },
      });
      setRequested(true);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[380px] px-5 py-24 text-center text-sm text-text-3">
        불러오는 중...
      </div>
    );
  }
  if (!isGuest) {
    return null;
  }

  if (requested) {
    return <MailSentNotice email={email} />;
  }

  return (
    <div className="mx-auto max-w-[380px] px-5 pt-12 pb-16">
      <header>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.035em] text-text-1">
          회원가입
        </h1>
        <p className="mt-2 text-[13px] leading-[1.7] text-text-2">
          입력하신 주소로 인증 메일을 보내드려요. 링크를 눌러야 가입이 끝나요.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-5">
        <div>
          <label htmlFor={emailId}>
            <Label required>이메일</Label>
          </label>
          <input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-2 ${FIELD} ${FOCUS_RING}`}
          />
          <p className="mt-1.5 text-[12px] leading-[1.65] text-text-3">
            이 주소로 인증 링크가 가요. 오타가 있으면 메일을 받을 수 없어요.
          </p>
        </div>

        <div>
          <label htmlFor={passwordId}>
            <Label required>비밀번호</Label>
          </label>
          <input
            id={passwordId}
            type="password"
            required
            maxLength={PASSWORD_MAX}
            autoComplete="new-password"
            placeholder={PASSWORD_RULE_TEXT}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={`${passwordId}-rule`}
            className={`mt-2 ${FIELD} ${FOCUS_RING}`}
          />
          {/* 규칙을 문장으로만 적으면 어디가 모자란지 알 수 없다. 조건별로 충족 여부를 보여준다.
              처음엔 12px 도트 4개를 한 줄에 붙였는데 잘 안 보였다 — 2열 격자로 벌리고,
              충족한 항목은 체크 표시로 바꿔 "무엇이 남았는지"가 형태로 읽히게 했다. */}
          <ul id={`${passwordId}-rule`} className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-[12.5px]">
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                    c.ok ? "bg-text-1 text-white" : "border border-border-2 text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className={c.ok ? "font-bold text-text-1" : "text-text-3"}>{c.label}</span>
                <span className="sr-only">{c.ok ? " 충족" : " 미충족"}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor={passwordConfirmId}>
            <Label required>비밀번호 확인</Label>
          </label>
          <input
            id={passwordConfirmId}
            type="password"
            required
            maxLength={PASSWORD_MAX}
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            aria-invalid={confirmMismatch || undefined}
            className={`mt-2 ${FIELD} ${FOCUS_RING} ${confirmMismatch ? "border-danger" : ""}`}
          />
          {/* 제출까지 기다리지 않고 치는 중에 알려준다 — 그래야 다시 치는 수고가 줄어든다. */}
          <p aria-live="polite" className="mt-1.5 min-h-[16px] text-[12px] text-danger">
            {confirmMismatch ? "비밀번호가 서로 달라요." : ""}
          </p>
        </div>

        <div>
          <label htmlFor={nicknameId}>
            <Label required>닉네임</Label>
          </label>
          <input
            id={nicknameId}
            type="text"
            required
            maxLength={50}
            autoComplete="nickname"
            placeholder={nicknameLoading ? "추천 닉네임을 불러오는 중..." : "닉네임"}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={`mt-2 ${FIELD} ${FOCUS_RING}`}
          />
          <div className="mt-2">
            <NicknameSuggestButton onSuggest={setNickname} />
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <ConsentFields values={consents} onChange={setConsents} />
        </div>

        <p role="alert" aria-live="polite" className="min-h-[18px] text-[12.5px] font-bold text-danger">
          {error}
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex h-[52px] w-full items-center justify-center rounded-[4px] bg-primary text-[15px] font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60 ${FOCUS_RING}`}
        >
          {isSubmitting ? "보내는 중..." : "인증 메일 받기"}
        </button>
      </form>

      <p className="mt-6 text-center text-[12.5px] text-text-3">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className={`font-bold text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary ${FOCUS_RING}`}
        >
          로그인
        </Link>
      </p>
    </div>
  );
}

// 서버가 이유를 코드로 알려준다. 전부 "실패했어요"로 뭉개면 사용자가 뭘 고쳐야 할지 모른다.
function resolveError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return "가입에 실패했어요. 잠시 후 다시 시도해 주세요.";
  }
  switch (err.errorCode) {
    case "EMAIL_SUPPRESSED":
      return "이 주소로는 메일을 보낼 수 없어요. 주소가 정확한지 확인하거나 다른 주소를 써주세요.";
    case "DUPLICATE_EMAIL":
      return "이미 가입된 이메일이에요. 로그인해 주세요.";
    case "DUPLICATE_NICKNAME":
      return "이미 사용 중인 닉네임이에요. 다른 닉네임을 골라주세요.";
    case "EMAIL_RESEND_TOO_SOON":
      return "조금 전에 메일을 보냈어요. 1분 뒤에 다시 시도해 주세요.";
    default:
      return err.message;
  }
}

/**
 * 가입 요청 이후 화면.
 *
 * <p>여기서 끝난 게 아니라는 걸 분명히 해야 한다 — 링크를 눌러야 가입이 완료된다.
 * 메일이 안 왔을 때 할 수 있는 일(스팸함 확인, 재발송)을 같은 화면에서 준다.
 */
function MailSentNotice({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    if (status === "sending") return;
    setStatus("sending");
    setMessage(null);
    try {
      await apiFetch("/api/auth/signup/resend", { method: "POST", body: { email } });
      setStatus("sent");
      setMessage("인증 메일을 다시 보냈어요.");
    } catch (err) {
      setStatus("idle");
      setMessage(err instanceof ApiError ? err.message : "다시 보내지 못했어요. 잠시 후 시도해 주세요.");
    }
  }

  return (
    <div className="mx-auto max-w-[420px] px-5 pt-14 pb-16">
      <p className="text-[11px] font-extrabold tracking-[0.08em] text-text-3">한 단계 남았어요</p>
      <h1 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.035em] text-text-1">
        메일함을 확인해 주세요
      </h1>
      <p className="mt-3 text-[13.5px] leading-[1.8] text-text-2">
        <b className="font-extrabold text-text-1">{email}</b> 으로 인증 링크를 보냈어요.{" "}
        <b className="font-extrabold text-text-1">링크를 눌러야 가입이 끝나요.</b>
      </p>

      <dl className="mt-7 flex flex-col divide-y divide-border border-y border-border">
        {[
          ["링크 유효기간", "보낸 뒤 24시간"],
          ["메일이 안 보이면", "스팸함도 확인해 주세요"],
          ["주소를 잘못 적었다면", "처음부터 다시 가입하면 돼요"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-4 py-3">
            <dt className="w-[104px] shrink-0 text-[12.5px] font-extrabold text-text-1">{k}</dt>
            <dd className="text-[12.5px] leading-[1.65] text-text-2">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={resend}
          disabled={status === "sending"}
          className={`inline-flex h-11 items-center rounded-[4px] border border-border-2 px-5 text-[13.5px] font-bold text-text-1 transition-colors hover:border-primary hover:text-primary disabled:opacity-60 ${FOCUS_RING}`}
        >
          {status === "sending" ? "보내는 중..." : "인증 메일 다시 보내기"}
        </button>
        <Link
          href="/login"
          className={`text-[13px] font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-text-1 hover:decoration-text-1 ${FOCUS_RING}`}
        >
          로그인 화면으로
        </Link>
      </div>

      <p aria-live="polite" className="mt-3 min-h-[18px] text-[12.5px] font-bold text-text-2">
        {message}
      </p>
    </div>
  );
}
