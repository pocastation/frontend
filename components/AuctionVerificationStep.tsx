"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { compressImage } from "@/lib/image-compress";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type {
  VerificationAnalysisResponse,
  VerificationChallengeResponse,
  VerificationFailureReason,
} from "@/lib/types";

const FAILURE_MESSAGE: Record<VerificationFailureReason, string> = {
  QUALITY_REJECTED: "사진이 너무 흐리거나 어둡습니다. 밝은 곳에서 흔들리지 않게 다시 찍어주세요.",
  CODE_REGION_NOT_FOUND: "손글씨 코드 영역을 찾지 못했습니다. 코드 전체가 선명하게 보이도록 다시 찍어주세요.",
  INVALID_CODE_FORMAT: "코드를 6자리로 읽지 못했습니다. 글자 사이를 조금 띄워 다시 써주세요.",
  CODE_MISMATCH: "사진 속 코드가 발급 코드와 일치하지 않습니다. 현재 코드를 확인해 다시 찍어주세요.",
  OCR_LOW_CONFIDENCE: "코드가 선명하지 않습니다. 정면에 가깝게 다시 촬영해주세요.",
  CARD_NOT_FOUND: "사진에서 포토카드 또는 별도의 직사각형 물체를 찾지 못했습니다. 코드와 포토카드를 한 화면에 담아주세요.",
  ANALYSIS_UNAVAILABLE: "사진 분석 중 일시적인 문제가 발생했습니다. 같은 사진으로 다시 시도해주세요.",
};

// 분석은 보통 1~2초에 끝난다(추론 자체는 0.25초, 나머지는 큐 대기·이미지 로드 — BE #304 계측).
// 2초 고정 간격이면 결과가 준비된 뒤에도 평균 1초를 더 기다리게 되므로 초반을 촘촘히 본다.
// 오래 걸리는 분석(최대 60초)에서는 2초로 수렴시켜 요청 수를 늘리지 않는다.
const POLL_DELAYS_MS = [400, 400, 600, 800, 1000, 1500];
const POLL_DELAY_MAX_MS = 2000;

export function verificationPollDelayMs(attempt: number): number {
  return POLL_DELAYS_MS[attempt] ?? POLL_DELAY_MAX_MS;
}

type Props = {
  verificationId: string | null;
  onVerified: (verificationId: string | null) => void;
};

export default function AuctionVerificationStep({ verificationId, onVerified }: Props) {
  const { fetchWithAuth, fetchMultipartWithAuth } = useAuth();
  const [challenge, setChallenge] = useState<VerificationChallengeResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const secondsLeft = challenge
    ? Math.max(0, Math.floor((new Date(challenge.expiresAt).getTime() - now) / 1000))
    : 0;
  const expired = Boolean(challenge) && secondsLeft === 0;
  const passed = Boolean(verificationId && result?.passed && !expired);
  const processing = !expired && (result?.status === "QUEUED" || result?.status === "ANALYZING");

  useEffect(() => {
    if (expired && verificationId) {
      onVerified(null);
    }
  }, [expired, onVerified, verificationId]);

  useEffect(() => {
    if (!challenge || !processing) return;
    const challengeId = challenge.id;
    let cancelled = false;
    let timer: number | undefined;
    let attempt = 0;

    function scheduleNextPoll() {
      timer = window.setTimeout(poll, verificationPollDelayMs(attempt));
      attempt += 1;
    }

    async function poll() {
      try {
        const status = await fetchWithAuth<VerificationAnalysisResponse>(
          `/api/auction-verifications/${challengeId}`,
        );
        if (cancelled) return;
        setResult(status);
        setError(null);
        if (status.status === "QUEUED" || status.status === "ANALYZING") {
          scheduleNextPoll();
          return;
        }
        setAnalyzing(false);
        const stillValid = status.passed && new Date(status.expiresAt).getTime() > Date.now();
        onVerified(stillValid ? status.id : null);
      } catch {
        if (cancelled) return;
        setError("분석 상태를 다시 확인하고 있습니다.");
        // 오류는 백오프를 유지한다 — 실패하는 요청을 촘촘히 두드리지 않는다.
        timer = window.setTimeout(poll, POLL_DELAY_MAX_MS);
      }
    }

    scheduleNextPoll();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [challenge, fetchWithAuth, onVerified, processing]);

  async function issueChallenge() {
    if (issuing || analyzing) return;
    setIssuing(true);
    setError(null);
    onVerified(null);
    setResult(null);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    try {
      const issued = await fetchWithAuth<VerificationChallengeResponse>("/api/auction-verifications", {
        method: "POST",
      });
      setChallenge(issued);
      setNow(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "인증 코드를 발급하지 못했습니다.");
    } finally {
      setIssuing(false);
    }
  }

  function selectFile(selected: File | null) {
    if (!selected) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
    onVerified(null);
  }

  async function analyze() {
    if (!challenge || !file || analyzing || expired) return;
    setAnalyzing(true);
    setError(null);
    const formData = new FormData();
    // OCR 민감 이미지라 품질 보수적(q0.9)으로 압축.
    const compressed = await compressImage(file, { quality: 0.9 });
    formData.append("file", compressed);
    try {
      const analysis = await fetchMultipartWithAuth<VerificationAnalysisResponse>(
        `/api/auction-verifications/${challenge.id}/analyze`,
        formData,
      );
      setResult(analysis);
      if (analysis.status !== "QUEUED" && analysis.status !== "ANALYZING") {
        setAnalyzing(false);
        const stillValid = analysis.passed && new Date(analysis.expiresAt).getTime() > Date.now();
        onVerified(stillValid ? analysis.id : null);
      }
    } catch (err) {
      onVerified(null);
      setError(err instanceof ApiError ? err.message : "사진 분석에 실패했습니다.");
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-4">
        <p className="text-sm font-extrabold text-text-1">판매 물품 소유 인증</p>
        <p className="mt-1 text-xs leading-5 text-text-3">
          발급 코드를 손으로 써서 포토카드와 함께 촬영해주세요. 코드는 발급 후 3분 뒤 만료되며,
          분석을 통과해도 시간이 연장되지 않습니다.
        </p>
      </div>

      {!challenge ? (
        <button
          type="button"
          onClick={issueChallenge}
          disabled={issuing}
          className={`h-11 w-full ${PRIMARY_BUTTON_CLASS}`}
        >
          {issuing ? "코드 발급 중..." : "인증 코드 발급"}
        </button>
      ) : (
        <>
          {/*
            🔴 연보라 배경 + 좌측 4px 규칙선이었다(#515). 규칙은 좌측 규칙선을 **진짜 경고에만**
            쓰라고 정해 뒀는데 인증 코드는 경고가 아니라 **읽고 옮겨 적는 값**이다. 회색 지면으로
            바꾸고, 강조는 값 자체(큰 monospace 숫자)가 지게 둔다. 이 단계에서 정말 경고인 것은
            아래 「곧 만료」 문장 하나뿐이고 그건 이미 accent색으로 말하고 있다.
          */}
          <div className="bg-surface-2 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-text-3">Verification code</span>
              <span className={`text-xs font-bold ${expired && !processing ? "text-accent" : "text-text-2"}`}>
                {processing
                  ? "사진 접수 완료"
                  : expired
                    ? "만료됨"
                    : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl text-text-1" aria-label={`인증 코드 ${challenge.code}`}>
              {challenge.code}
            </p>
            {!processing && secondsLeft > 0 && secondsLeft <= 60 && (
              <p className="mt-2 text-xs font-bold text-accent" role="status">
                {passed
                  ? "인증이 곧 만료됩니다. 지금 판매 등록을 완료해주세요."
                  : "코드가 곧 만료됩니다. 1분 안에 사진 확인을 완료해주세요."}
              </p>
            )}
            {!expired && !passed && !processing && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={issueChallenge}
                  disabled={issuing}
                  className={`h-9 px-3 text-xs ${SECONDARY_BUTTON_CLASS}`}
                >
                  {issuing ? "재발급 중..." : "인증 코드 재발급"}
                </button>
              </div>
            )}
          </div>

          {processing ? (
            /* 두 번째 연보라 패널이었다(#515). 진행 상태는 패널이 아니라 문장이 말한다 —
               지면을 걷고 헤어라인 하나로 구분한다. 아래 「인증 완료」는 성공을 색으로 말해야
               하므로 ok 지면을 그대로 둔다(연보라 반복과 달리 의미가 있는 색이다). */
            <div className="border-t border-border pt-3" role="status">
              <p className="text-sm font-extrabold text-text-1">
                {result?.status === "ANALYZING" ? "인증 사진 분석 중" : "인증 사진 분석 대기 중"}
              </p>
              <p className="mt-1 text-xs leading-5 text-text-3">
                {result?.status === "QUEUED" && result.queuePosition
                  ? `현재 대기 순서 ${result.queuePosition}번째입니다. 순서대로 확인하고 있습니다.`
                  : "코드와 카드 형태를 확인하고 있습니다. 잠시만 기다려주세요."}
              </p>
            </div>
          ) : passed ? (
            <div className="border border-ok/30 bg-ok-soft px-4 py-3" role="status">
              <p className="text-sm font-extrabold text-ok">사진 인증 완료</p>
              <p className="mt-1 text-xs text-text-2">
                위 남은 시간 안에 등록을 완료해주세요. 이후 관리자 검수를 거쳐 매물이 공개됩니다.
              </p>
            </div>
          ) : expired ? (
            <button type="button" onClick={issueChallenge} className={`h-11 w-full ${PRIMARY_BUTTON_CLASS}`}>
              인증 코드 재발급
            </button>
          ) : (
            <>
              <label
                className={`block cursor-pointer border-2 border-dashed border-border-2 p-3 transition-colors hover:border-primary ${FOCUS_RING}`}
              >
                <span className="block text-center text-sm font-bold text-text-2">
                  {file ? "다른 인증 사진 선택" : "인증 사진 촬영 또는 선택"}
                </span>
                <span className="mt-1 block text-center text-[11px] text-text-3">JPG, PNG, WebP · 최대 10MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={(event) => {
                    selectFile(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>

              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- 제출 전 브라우저 로컬 미리보기
                <img
                  src={previewUrl}
                  alt="선택한 인증 사진 미리보기"
                  className="max-h-72 w-full border border-border bg-surface-2 object-contain"
                />
              )}

              {result && !result.passed && result.failureReason && (
                <div className="border border-accent/30 bg-accent-soft px-4 py-3" role="alert">
                  <p className="text-sm font-extrabold text-accent">재촬영이 필요합니다</p>
                  <p className="mt-1 text-xs leading-5 text-text-2">{FAILURE_MESSAGE[result.failureReason]}</p>
                </div>
              )}

              <button
                type="button"
                onClick={analyze}
                disabled={!file || analyzing}
                className={`h-11 w-full ${PRIMARY_BUTTON_CLASS}`}
              >
                {analyzing ? "코드와 포토카드 확인 중..." : "인증 사진 확인"}
              </button>
            </>
          )}
        </>
      )}

      {error && (
        <p className="text-xs text-accent" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
