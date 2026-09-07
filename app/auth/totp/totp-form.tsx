"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  totpDestination,
  totpError,
  totpRequest,
  type AdminTotpChallenge,
  type TotpEnrollment,
  type TotpEnrollmentCompleted,
} from "@/lib/admin-totp";
import {
  openIdentityWindow,
  readRedirectedIdentityResult,
  stripIdentityRedirectParams,
  IDENTITY_NOT_READY_MESSAGE,
} from "@/lib/identity-verification";
import {
  FOCUS_RING,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/lib/ui";
import type { TokenResponse } from "@/lib/types";

type Screen =
  | "loading"
  | "verify"
  | "pass"
  | "enroll"
  | "backup"
  | "recover"
  | "recoverycode";
type InitialState = {
  challenge: AdminTotpChallenge;
  enrollment?: TotpEnrollment;
  error?: string;
  passCompleted?: boolean;
};
const primary = `w-full min-h-12 px-4 ${PRIMARY_BUTTON_CLASS}`;
const secondary = `w-full min-h-12 px-4 ${SECONDARY_BUTTON_CLASS}`;
const quiet = `min-h-11 px-2 text-xs text-text-2 underline underline-offset-4 ${FOCUS_RING}`;

export default function AdminTotpForm() {
  const router = useRouter();
  const search = useSearchParams();
  const destination = totpDestination(search.get("next"));
  const { completeTotpLogin } = useAuth();
  const [screen, setScreen] = useState<Screen>("loading");
  const [challenge, setChallenge] = useState<AdminTotpChallenge | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [completion, setCompletion] = useState<TotpEnrollmentCompleted | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [passCompleted, setPassCompleted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restart, setRestart] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const initial = useRef<Promise<InitialState> | null>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);

  const report = useCallback((cause: unknown) => {
    const result = totpError(cause);
    setError(result.message);
    setRestart(result.restart);
    if (result.restart) {
      setChallenge(null);
      setEnrollment(null);
      setCode("");
      setRecoveryCode("");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // StrictMode가 effect를 다시 실행해도 PASS 영수증을 두 번 소비하지 않는다.
    if (!initial.current)
      initial.current = (async () => {
        const url = new URL(window.location.href);
        const result = readRedirectedIdentityResult(url.searchParams);
        window.history.replaceState(
          window.history.state,
          "",
          stripIdentityRedirectParams(url),
        );
        const current = await totpRequest<AdminTotpChallenge>("challenge");
        if (result?.kind === "failed")
          return {
            challenge: current,
            error: "본인인증이 완료되지 않았어요. 다시 진행해 주세요.",
          };
        if (result?.kind === "verified") {
          if (result.receiptId !== current.identityVerificationId)
            throw new ApiError("", "ADMIN_TOTP_CHALLENGE_INVALID", 401);
          try {
            const registered = await totpRequest<TotpEnrollment>("enrollment", {
              challengeToken: current.challengeToken,
            });
            return { challenge: registered.challenge, enrollment: registered };
          } catch (cause) {
            if (totpError(cause).restart) throw cause;
            return {
              challenge: current,
              error: totpError(cause).message,
              passCompleted: true,
            };
          }
        }
        return { challenge: current };
      })();
    initial.current
      .then((result) => {
        if (!mounted.current) return;
        if (
          result.challenge.nextStep === "TOTP_ENROLLMENT_REQUIRED" &&
          !result.enrollment
        ) {
          // 새로고침으로 소실된 비밀키를 저장소나 URL에서 복원하지 않는다.
          report(new ApiError("", "ADMIN_TOTP_CHALLENGE_INVALID", 401));
          setScreen("pass");
          return;
        }
        setChallenge(result.challenge);
        setEnrollment(result.enrollment ?? null);
        setPassCompleted(result.passCompleted ?? false);
        setScreen(
          result.enrollment
            ? "enroll"
            : result.passCompleted
              ? "pass"
              : result.challenge.nextStep === "TOTP_REQUIRED"
                ? "verify"
                : "pass",
        );
        setError(result.error ?? null);
      })
      .catch((cause) => {
        if (mounted.current) {
          report(cause);
          setScreen("pass");
        }
      });
    return () => {
      mounted.current = false;
    };
  }, [report]);

  useEffect(() => {
    if (!challenge || screen === "backup") return;
    const expire = () => {
      if (
        !Number.isFinite(Date.parse(challenge.expiresAt)) ||
        Date.parse(challenge.expiresAt) <= Date.now()
      ) {
        report(new ApiError("", "ADMIN_TOTP_CHALLENGE_INVALID", 401));
      }
    };
    const timer = window.setInterval(expire, 1000);
    return () => window.clearInterval(timer);
  }, [challenge, screen, report]);

  // 탭이 문서째 이동하거나 BFCache에서 복귀하면 인증 정보를 새로 확인한다.
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  async function run(action: () => Promise<void>) {
    if (inFlight.current || restart) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setCopyMessage("");
    try {
      await action();
    } catch (cause) {
      if (mounted.current) report(cause);
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function show(next: Screen) {
    setScreen(next);
    setCode("");
    setRecoveryCode("");
    setError(null);
    setCopyMessage("");
  }

  function registered(result: TotpEnrollment) {
    if (!mounted.current) return;
    setChallenge(result.challenge);
    setEnrollment(result);
    setCode("");
    setRecoveryCode("");
    setScreen("enroll");
    // PASS/OAuth의 초기 응답 Promise에 새 비밀키를 계속 보관하지 않는다.
    initial.current = null;
  }

  async function pass() {
    if (!challenge) return;
    await run(async () => {
      if (!passCompleted) {
        const receipt = await openIdentityWindow(
          `${window.location.origin}/auth/totp?next=${encodeURIComponent(destination)}`,
          challenge.identityVerificationId,
        );
        if (!mounted.current) return;
        if (!receipt) {
          setError(IDENTITY_NOT_READY_MESSAGE);
          return;
        }
        if (receipt !== challenge.identityVerificationId)
          throw new ApiError("", "ADMIN_TOTP_CHALLENGE_INVALID", 401);
        setPassCompleted(true);
      }
      registered(
        await totpRequest<TotpEnrollment>("enrollment", {
          challengeToken: challenge.challengeToken,
        }),
      );
    });
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;
    if (!/^\d{6}$/.test(code)) {
      setError("인증번호 6자리를 입력해 주세요.");
      return;
    }
    await run(async () => {
      const body = { challengeToken: challenge.challengeToken, code };
      if (screen === "enroll") {
        const result = await totpRequest<TotpEnrollmentCompleted>(
          "enrollment/confirm",
          body,
        );
        if (!mounted.current) return;
        setCompletion(result);
        setEnrollment(null);
        setChallenge(null);
        setCode("");
        setScreen("backup");
        initial.current = null;
      } else {
        const result = await totpRequest<TokenResponse>("verify", body);
        if (!mounted.current) return;
        // /me 조회만 실패했으면 소모된 OTP를 재전송하지 않고 완료 처리를 재시도한다.
        setCompletion({ ...result, recoveryCodes: [] });
        setChallenge(null);
        setCode("");
        await finish(result.accessToken);
      }
    });
  }

  async function finish(token: string) {
    await completeTotpLogin(token);
    if (!mounted.current) return;
    setCompletion(null);
    setEnrollment(null);
    setChallenge(null);
    router.replace(destination);
  }

  async function recover(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;
    if (!recoveryCode.trim()) {
      setError("복구 코드를 입력해 주세요.");
      return;
    }
    await run(async () => {
      try {
        registered(
          await totpRequest<TotpEnrollment>("recovery", {
            challengeToken: challenge.challengeToken,
            code: recoveryCode.trim(),
          }),
        );
      } catch (cause) {
        if (
          cause instanceof ApiError &&
          cause.errorCode === "ADMIN_TOTP_INVALID"
        ) {
          setError("복구 코드가 일치하지 않거나 이미 사용됐어요.");
          return;
        }
        throw cause;
      }
    });
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage("복사했어요. 안전한 곳에 보관해 주세요.");
    } catch {
      setCopyMessage("자동 복사가 안 돼요. 내용을 선택해 직접 복사해 주세요.");
    }
  }

  const heading =
    screen === "verify"
      ? "2차 인증"
      : screen === "enroll"
        ? "인증 앱에 계정 추가"
        : screen === "backup"
          ? "복구 코드를 보관해 주세요"
          : screen === "recover"
            ? "인증 앱을 사용할 수 없나요?"
            : screen === "recoverycode"
              ? "복구 코드를 입력해 주세요"
              : recovering
                ? "본인 확인 후 다시 등록해요"
                : "인증 앱을 등록해 주세요";
  const description =
    screen === "verify"
      ? "인증 앱의 번호를 입력하면 로그인이 완료돼요."
      : screen === "enroll"
        ? "인증 앱에서 QR 코드를 스캔해 주세요."
        : screen === "backup"
          ? "인증 앱을 사용할 수 없을 때 아래 코드로 다시 등록할 수 있어요."
          : screen === "recover"
            ? "본인 확인 후 새 인증 앱을 등록해 다시 로그인할 수 있어요."
            : screen === "recoverycode"
              ? "보관한 복구 코드 중 사용하지 않은 코드 1개를 입력해 주세요."
              : "가입할 때 인증한 본인 명의로 PASS 인증을 진행해 주세요.";
  const errorView = error && (
    <p role="alert" className="my-4 text-xs leading-relaxed text-danger">
      {error}
    </p>
  );
  const otp = (
    <>
      <label htmlFor="totp-code" className="mb-2 block text-[13px]">
        인증번호
      </label>
      <input
        id="totp-code"
        className={`${INPUT_CLASS} h-[50px] text-center !text-2xl tracking-[0.4em] tabular-nums`}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
        disabled={busy || restart}
        aria-invalid={!!error}
        aria-describedby="totp-help"
      />
      <p id="totp-help" className="mb-5 mt-2 text-xs text-text-2">
        인증 앱에 표시된 6자리 번호를 입력해 주세요.
      </p>
    </>
  );

  if (screen === "loading")
    return (
      <p className="py-24 text-center text-sm text-text-2">
        인증 정보를 확인하고 있어요...
      </p>
    );

  return (
    <section
      className="mx-auto max-w-sm px-5 py-10 sm:py-16"
      aria-label="관리자 2차 인증"
    >
      <div className="mb-8 text-center">
        <p className="mb-2 text-xs text-text-2">
          {screen === "backup"
            ? "관리자 보안 설정 · 3 / 3"
            : screen === "enroll"
              ? "관리자 보안 설정 · 2 / 3"
              : screen === "pass" && !recovering
                ? "관리자 보안 설정 · 1 / 3"
                : "관리자 로그인"}
        </p>
        <h1 className="mb-3 text-[22px] font-extrabold tracking-tight text-text-1">
          {heading}
        </h1>
        <p className="text-sm leading-7 text-text-2">{description}</p>
      </div>
      {restart ? (
        <>
          {errorView}
          <Link
            href="/login"
            className={`flex items-center justify-center ${primary}`}
          >
            다시 로그인
          </Link>
        </>
      ) : (
        <>
          {screen === "verify" &&
            (completion ? (
              <>
                {errorView}
                <button
                  className={primary}
                  disabled={busy}
                  onClick={() => run(() => finish(completion.accessToken))}
                >
                  로그인 완료 다시 시도
                </button>
              </>
            ) : (
              <>
                <form onSubmit={verify}>
                  {otp}
                  {errorView}
                  <button className={primary} disabled={busy || !challenge}>
                    {busy ? "인증 중..." : "인증하고 로그인"}
                  </button>
                </form>
                <div className="mt-4 text-center">
                  <button
                    className={quiet}
                    disabled={busy}
                    onClick={() => show("recover")}
                  >
                    인증 앱을 사용할 수 없나요?
                  </button>
                </div>
              </>
            ))}
          {screen === "pass" && (
            <>
              <div className="mb-7 border-y border-border py-4">
                <p className="mb-1 text-sm font-bold">PASS 본인인증</p>
                <p className="text-xs leading-6 text-text-2">
                  관리자 계정에 등록된 본인 정보와 대조해요.
                </p>
              </div>
              {recovering && <RecoveryNotice />}
              {errorView}
              <button
                className={primary}
                disabled={busy || !challenge}
                onClick={pass}
              >
                {busy
                  ? "본인 확인 중..."
                  : passCompleted
                    ? "인증 결과 다시 확인"
                    : "PASS로 본인인증"}
              </button>
              {!challenge && !busy && (
                <button
                  className={`mt-3 ${secondary}`}
                  onClick={() => window.location.reload()}
                >
                  다시 확인
                </button>
              )}
            </>
          )}
          {screen === "enroll" && enrollment && (
            <>
              <div className="mx-auto mb-5 w-fit border border-border p-2">
                <QRCodeSVG
                  value={enrollment.otpauthUri}
                  size={180}
                  marginSize={4}
                  title="인증 앱 등록 QR 코드"
                />
              </div>
              <details className="mb-6 text-xs">
                <summary
                  className={`min-h-11 cursor-pointer py-3 text-text-2 ${FOCUS_RING}`}
                >
                  같은 휴대폰이라 스캔하기 어렵나요?
                </summary>
                <p className="my-2 leading-6 text-text-2">
                  설정 키를 복사해 인증 앱의 ‘설정 키 입력’으로 추가해 주세요.
                </p>
                <code className="block select-all break-all bg-surface-2 p-3 font-mono text-sm">
                  {enrollment.secret}
                </code>
                <button
                  type="button"
                  className={`mt-3 ${secondary}`}
                  onClick={() => copy(enrollment.secret)}
                >
                  설정 키 복사
                </button>
              </details>
              <form onSubmit={verify}>
                {otp}
                {errorView}
                <button className={primary} disabled={busy}>
                  {busy ? "등록 중..." : "등록 완료"}
                </button>
              </form>
            </>
          )}
          {screen === "backup" && completion && (
            <>
              <p className="border-l-2 border-border-2 pl-3 text-xs leading-6 text-text-2">
                이 화면에서 한 번만 보여드려요.
                <br />각 코드는 한 번만 사용할 수 있어요.
              </p>
              <ol className="my-5 space-y-3 bg-surface-2 p-4">
                {completion.recoveryCodes.map((value, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-4 shrink-0 text-xs text-text-2">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <code className="min-w-0 select-all break-all font-mono text-xs leading-5">
                      {value}
                    </code>
                  </li>
                ))}
              </ol>
              <button
                className={secondary}
                onClick={() => copy(completion.recoveryCodes.join("\n"))}
              >
                복구 코드 복사
              </button>
              <label className="my-4 flex min-h-12 cursor-pointer items-center gap-3 text-[13px]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={saved}
                  onChange={(e) => setSaved(e.target.checked)}
                />
                복구 코드를 안전한 곳에 보관했어요.
              </label>
              {errorView}
              <button
                className={primary}
                disabled={!saved || busy}
                onClick={() => run(() => finish(completion.accessToken))}
              >
                {busy ? "로그인 중..." : "계속하기"}
              </button>
            </>
          )}
          {screen === "recover" && (
            <>
              <button
                className={primary}
                onClick={() => {
                  setRecovering(true);
                  show("pass");
                }}
              >
                PASS로 본인 확인
              </button>
              <button
                className={`mt-3 ${secondary}`}
                onClick={() => show("recoverycode")}
              >
                복구 코드로 확인
              </button>
              <RecoveryNotice />
              <div className="text-center">
                <button className={quiet} onClick={() => show("verify")}>
                  인증번호 입력으로 돌아가기
                </button>
              </div>
            </>
          )}
          {screen === "recoverycode" && (
            <>
              <form onSubmit={recover}>
                <label
                  className="mb-2 block text-[13px]"
                  htmlFor="recovery-code"
                >
                  복구 코드
                </label>
                <input
                  id="recovery-code"
                  className={`${INPUT_CLASS} h-12 !text-base`}
                  autoComplete="off"
                  spellCheck={false}
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="복구 코드 붙여넣기"
                  disabled={busy}
                  maxLength={100}
                />
                <p className="my-3 text-xs text-text-2">
                  코드 확인 후 새 인증 앱을 등록해요.
                </p>
                {errorView}
                <button className={primary} disabled={busy}>
                  {busy ? "확인 중..." : "확인하고 다시 등록"}
                </button>
              </form>
              <div className="mt-3 text-center">
                <button
                  className={quiet}
                  disabled={busy}
                  onClick={() => {
                    setRecovering(true);
                    show("pass");
                  }}
                >
                  PASS로 본인 확인하기
                </button>
              </div>
            </>
          )}
          <p className="mt-3 text-xs text-text-2" role="status">
            {copyMessage}
          </p>
          {screen !== "backup" && (
            <div className="mt-3 text-center">
              <Link
                href="/login"
                className={`inline-flex items-center ${quiet}`}
              >
                다른 계정으로 로그인
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RecoveryNotice() {
  return (
    <p className="my-6 border-l-2 border-border-2 pl-3 text-xs leading-6 text-text-2">
      본인 확인을 완료하면 기존 인증 앱과 복구 코드가 해제되고, 모든 기기에서
      로그아웃돼요.
    </p>
  );
}
