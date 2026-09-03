"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AUCTION_REJECTION_REASON_OPTIONS } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type {
  AdminAuctionSummary,
  AdminAuctionVerificationResponse,
  AuctionImageResponse,
  AuctionRejectionReasonCode,
  AuctionVideoResponse,
} from "@/lib/types";

type Props = {
  auction: AdminAuctionSummary;
  onClose: () => void;
  onReviewed: (message: string) => Promise<void>;
};

function formatPercentage(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "미분석";
  const percentage = value * 100;
  return `${percentage.toFixed(percentage % 1 === 0 ? 0 : 1)}%`;
}

function AnalysisSection({
  title,
  passed,
  metrics,
  condition,
  advisory = false,
  children,
}: {
  title: string;
  passed: boolean | null;
  metrics: { label: string; value: string; passed?: boolean | null }[];
  condition: string;
  advisory?: boolean;
  children?: ReactNode;
}) {
  const analyzed = metrics.some((metric) => metric.value !== "미분석");
  const statusText = advisory
    ? analyzed ? "참고 지표" : "미분석"
    : passed === null ? "미분석" : passed ? "통과" : "미통과";
  const statusColor = advisory || passed === null ? "text-text-3" : passed ? "text-ok" : "text-accent";
  return (
    <div className="border-b border-border py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-extrabold text-text-2">{title}</h3>
        <span className={`text-xs font-extrabold ${statusColor}`}>
          {statusText}
        </span>
      </div>
      <dl className="mt-2 grid gap-1.5 text-xs">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between gap-3">
            <dt className="text-text-3">{metric.label}</dt>
            <dd className={`font-bold ${metric.passed == null ? "text-text-2" : metric.passed ? "text-ok" : "text-accent"}`}>
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
      {children}
      <p className="mt-2 border-l-2 border-border-2 pl-2 text-[11px] leading-5 text-text-3">
        <span className="font-extrabold text-text-2">{advisory ? "산출 방식" : "통과 조건"} · </span>{condition}
      </p>
    </div>
  );
}

export default function AuctionVerificationReviewDialog({ auction, onClose, onReviewed }: Props) {
  const { fetchWithAuth, fetchBlobWithAuth } = useAuth();
  const [verification, setVerification] = useState<AdminAuctionVerificationResponse | null>(null);
  const [verificationImageUrl, setVerificationImageUrl] = useState<string | null>(null);
  const [publicImages, setPublicImages] = useState<AuctionImageResponse[]>([]);
  const [reviewVideo, setReviewVideo] = useState<AuctionVideoResponse | null>(null);
  const [reasonCode, setReasonCode] = useState<AuctionRejectionReasonCode | "">("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedReason = AUCTION_REJECTION_REASON_OPTIONS.find((option) => option.code === reasonCode) ?? null;
  const finalPassed = verification?.status === "PASSED" || verification?.status === "CONSUMED";
  const finalAnalyzed = verification != null
    && verification.status !== "ISSUED"
    && verification.status !== "QUEUED"
    && verification.status !== "ANALYZING";
  const modelVersion = verification?.modelVersion ?? null;
  const isTrocrV5 = modelVersion?.includes("trocr-v5") ?? false;
  const modelVersionPending = modelVersion === null;
  const readOnly = auction.status !== "PENDING_REVIEW";
  const reviewResult = auction.status === "REJECTED"
    ? "승인 거절"
    : auction.reviewedAt
      ? "승인됨"
      : "검수 기록 없음";

  // Esc로 닫기 — 처리 중(submitting)에는 막는다(승인/반려 요청이 날아간 뒤 창만 사라지는 걸 방지).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [detail, images, video] = await Promise.all([
          fetchWithAuth<AdminAuctionVerificationResponse>(`/api/admin/auctions/${auction.id}/verification`),
          fetchWithAuth<AuctionImageResponse[]>(`/api/admin/auctions/${auction.id}/images`),
          fetchWithAuth<AuctionVideoResponse | null>(`/api/admin/auctions/${auction.id}/video`),
        ]);
        if (!active) return;
        setVerification(detail);
        setPublicImages(images);
        setReviewVideo(video);
        if (detail.imageAvailable) {
          const blob = await fetchBlobWithAuth(`/api/admin/auctions/${auction.id}/verification/image`);
          if (!active) return;
          objectUrl = URL.createObjectURL(blob);
          setVerificationImageUrl(objectUrl);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : "인증 자료를 불러오지 못했습니다.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [auction.id, fetchBlobWithAuth, fetchWithAuth]);

  async function approve() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/admin/auctions/${auction.id}/approve`, { method: "PATCH" });
      await onReviewed(`"${auction.title}"을(를) 승인했습니다.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "승인에 실패했습니다.");
      setSubmitting(false);
    }
  }

  async function reject() {
    if (submitting) return;
    if (!reasonCode) {
      setError("거절 사유를 선택해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/admin/auctions/${auction.id}/reject`, {
        method: "PATCH",
        body: { reasonCode },
      });
      await onReviewed(`"${auction.title}"의 승인을 거절했습니다. 판매자에게 사유가 전달됐습니다.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "승인 거절에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center overflow-hidden bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-review-title"
      onClick={(event) => {
        // 배경(오버레이 자신)을 클릭했을 때만 닫는다. 내부 클릭은 버블링돼도 무시.
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-r3 bg-surface shadow-modal sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-surface px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="verification-review-title" className="truncate font-display text-lg font-extrabold text-text-1">
                사진 인증 검수 내용
              </h2>
              {readOnly && (
                <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                  읽기 전용
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-text-3">{auction.title} · {auction.sellerNickname ?? "판매자 미상"}</p>
          </div>
          {/* 닫기는 얇은 '×' 글리프였을 때 배경과 구분이 안 돼 "버튼이 없다"고 읽혔다.
              테두리 있는 원형 + Lucide 계열 X SVG로 교체한다(글리프는 폰트에 따라 광학 중심도 어긋난다). */}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="검수 창 닫기"
            title="닫기 (Esc)"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-2 transition-colors hover:border-text-2 hover:bg-surface-2 hover:text-text-1 disabled:opacity-50 ${FOCUS_RING}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
          {readOnly && (
            <dl className="mb-5 grid gap-3 rounded-r2 border border-border bg-surface-2 px-4 py-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-text-3">검수 결과</dt>
                <dd className={`mt-1 font-extrabold ${
                  auction.status === "REJECTED" ? "text-accent" : auction.reviewedAt ? "text-ok" : "text-text-3"
                }`}>
                  {reviewResult}
                </dd>
              </div>
              <div>
                <dt className="text-text-3">검수 일시</dt>
                <dd className="mt-1 font-bold text-text-2">
                  {auction.reviewedAt ? new Date(auction.reviewedAt).toLocaleString("ko-KR") : "기록 없음"}
                </dd>
              </div>
              <div>
                <dt className="text-text-3">검수 사유</dt>
                <dd className="mt-1 font-bold text-text-2">{auction.reviewReason ?? "—"}</dd>
              </div>
            </dl>
          )}
          {loading ? (
            <p className="py-16 text-center text-sm text-text-3">인증 자료를 불러오는 중...</p>
          ) : error && !verification ? (
            <p className="bg-accent-soft px-4 py-3 text-sm text-accent" role="alert">{error}</p>
          ) : verification ? (
            <>
              {readOnly && error && (
                <p className="mb-4 border-l-2 border-accent px-3 py-2 text-sm text-accent" role="alert">{error}</p>
              )}
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.62fr)]">
                <section>
                  <figure>
                    <figcaption className="mb-2 text-xs font-extrabold text-text-2">관리자 전용 인증 사진</figcaption>
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden border border-border bg-surface-2">
                      {verificationImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- 인증이 필요한 Blob URL
                        <img src={verificationImageUrl} alt="판매자가 제출한 인증 사진" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs text-text-3">인증 사진 없음</span>
                      )}
                    </div>
                  </figure>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-extrabold text-text-2">틸팅 검수영상</p>
                    {reviewVideo ? (
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        poster={reviewVideo.posterUrl ? mediaUrl(reviewVideo.posterUrl) : undefined}
                        src={mediaUrl(reviewVideo.url)}
                        className="aspect-video w-full border border-border bg-black object-contain"
                      >
                        브라우저가 영상 재생을 지원하지 않습니다.
                      </video>
                    ) : (
                      <div className="flex aspect-video items-center justify-center border border-border bg-surface-2 text-xs text-text-3">
                        등록된 검수영상 없음
                      </div>
                    )}
                    <p className="mt-1.5 text-[11px] leading-5 text-text-3">
                      개봉 상태와 표면 틸팅을 재생해 판매사진·인증사진과 같은 물품인지 확인하세요.
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-extrabold text-text-2">공개 판매 사진 {publicImages.length}장</p>
                    {publicImages.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {publicImages.map((image, index) => (
                          <figure key={`${image.displayOrder}-${image.url}`}>
                            <a
                              href={mediaUrl(image.url)}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`공개 판매 사진 ${index + 1} 원본 보기`}
                              className={`flex aspect-[4/3] items-center justify-center overflow-hidden border border-border bg-surface-2 hover:border-primary ${FOCUS_RING}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드 공개 미디어 */}
                              <img
                                src={mediaUrl(image.url)}
                                alt={`공개 판매 사진 ${index + 1}`}
                                className="h-full w-full object-contain"
                              />
                            </a>
                            <figcaption className="mt-1 text-[10.5px] text-text-3">사진 {index + 1}</figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center border border-border bg-surface-2 text-xs text-text-3">
                        공개 판매 사진 없음
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-text-3">
                    인증 사진과 공개 판매 사진의 물품이 자연스럽게 이어지는지, 코드나 물품을 붙여 넣은 흔적이 없는지 직접 확인하세요.
                  </p>
                </section>

                <section>
                  <div className="flex items-baseline justify-between border-b border-border pb-3">
                    <span className="text-xs font-bold text-text-3">발급 코드</span>
                    <strong className="font-mono text-xl text-text-1">{verification.issuedCode}</strong>
                  </div>
                  <div className="flex items-baseline justify-between border-b border-border py-3">
                    <span className="text-xs font-bold text-text-3">인식 코드</span>
                    <strong className="font-mono text-xl text-text-1">{verification.detectedCode ?? "—"}</strong>
                  </div>
                  <div
                    className={`mt-3 border px-3 py-3 ${
                      modelVersionPending
                        ? "border-border bg-surface-2"
                        : isTrocrV5
                          ? "border-border"
                          : "border-accent bg-accent-soft"
                    }`}
                    role={!modelVersionPending && !isTrocrV5 ? "alert" : undefined}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-extrabold text-text-1">OCR 실행 구성</h3>
                      <span className={`text-xs font-extrabold ${modelVersionPending ? "text-text-3" : isTrocrV5 ? "text-ok" : "text-accent"}`}>
                        {modelVersionPending ? "분석 정보 대기" : isTrocrV5 ? "TrOCR v5 가중치" : "v5 아님"}
                      </span>
                    </div>
                    {isTrocrV5 ? (
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                        <dt className="text-text-3">입력 처리</dt>
                        <dd className="text-right font-bold text-text-2">원근 보정 · 명암 보정 없음</dd>
                        <dt className="text-text-3">디코딩</dt>
                        <dd className="text-right font-bold text-text-2">Greedy · Beam 1</dd>
                        <dt className="text-text-3">후보 재정렬</dt>
                        <dd className="text-right font-bold text-text-2">사용 안 함</dd>
                      </dl>
                    ) : (
                      <p className="mt-2 text-[11px] leading-5 text-text-3">
                        {modelVersionPending
                          ? "모델 버전은 분석이 끝난 뒤 표시됩니다."
                          : "TrOCR v5 가중치 결과가 아닙니다. 모델 버전과 분석 결과를 확인하세요."}
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <AnalysisSection
                      title="OCR 인식 참고 지표"
                      passed={null}
                      advisory
                      metrics={[
                        {
                          label: "인식 결과 참고 점수",
                          value: formatPercentage(verification.ocrConfidenceScore),
                        },
                      ]}
                      condition={isTrocrV5
                        ? "Greedy 디코딩이 각 생성 단계에서 선택한 토큰 점수의 기하평균입니다. 정답 확률이나 자동 통과 기준은 아닙니다."
                        : "모델이 최종 선택한 인식 단위의 참고 지표입니다. 확률 보정값이 아니며 최종 통과를 직접 결정하지 않습니다."}
                    >
                      <p className="mt-1 text-[11px] leading-5 text-text-3">
                        높을수록 생성 과정에서 선택한 토큰들을 모델이 상대적으로 강하게 지지했다는 뜻입니다. 낮은 토큰을 사진과 대조하세요.
                      </p>
                      <div className="mt-3 border-t border-border pt-2">
                        <p className="text-[11px] font-extrabold text-text-3">인식 단위별 참고 점수</p>
                        <p className="mt-1 text-[11px] leading-5 text-text-3">
                          {isTrocrV5
                            ? "Greedy 디코딩이 각 단계에서 선택한 토큰의 점수입니다. 한 토큰에 여러 문자가 포함될 수 있습니다."
                            : "모델이 반환한 토큰 단위 참고 점수입니다."}
                        </p>
                        {verification.ocrTokenConfidences?.length ? (
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {verification.ocrTokenConfidences.map((item, index) => (
                              <div key={`${item.token}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-mono font-bold text-text-2">{item.token}</span>
                                <span className="font-bold text-text-1">{formatPercentage(item.confidence)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-text-3">미분석</p>
                        )}
                      </div>
                    </AnalysisSection>
                    <AnalysisSection
                      title="코드 영역 탐지"
                      passed={verification.codeRegionDetected}
                      metrics={[
                        { label: "코드 영역 모델 점수", value: formatPercentage(verification.codeRegionScore) },
                        {
                          label: "모서리 유효 여부",
                          value: verification.codeCornersValid === null ? "미분석" : verification.codeCornersValid ? "유효" : "유효하지 않음",
                          passed: verification.codeCornersValid,
                        },
                      ]}
                      condition="코드 영역 모델 점수 ≥ 50%이며 네 모서리가 유효한 볼록 사각형이어야 합니다."
                    />
                    <AnalysisSection
                      title="판매 물품 형태 확인"
                      passed={verification.cardPresent}
                      metrics={[
                        { label: "카드 모델 점수", value: formatPercentage(verification.cardModelScore) },
                        { label: "기하학 점수", value: formatPercentage(verification.geometryScore) },
                      ]}
                      condition="카드 모델 점수 ≥ 66.7% 또는 기하학 점수 ≥ 90% 중 하나를 충족해야 합니다."
                    />
                    <div className="mt-4 border border-border px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-xs font-extrabold text-text-1">최종 자동 판정</h3>
                        <span className={`text-xs font-extrabold ${!finalAnalyzed ? "text-text-3" : finalPassed ? "text-ok" : "text-accent"}`}>
                          {!finalAnalyzed ? "미분석" : finalPassed ? "통과" : "미통과"}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-text-3">
                        코드 영역 통과 + 유효한 6자리 코드 + 발급 코드 정확히 일치 + 판매 물품 형태 통과를 모두 충족해야 합니다.
                      </p>
                      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                        <span className="text-text-3">발급 코드 일치 여부</span>
                        <strong className={verification.codeExact === null ? "text-text-3" : verification.codeExact ? "text-ok" : "text-accent"}>
                          {verification.codeExact === null ? "미분석" : verification.codeExact ? "일치" : "불일치"}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <dt className="text-text-3">분석 모델</dt>
                    <dd className="break-all text-right font-bold text-text-2" title={modelVersion ?? undefined}>
                      {modelVersion ?? "—"}
                    </dd>
                  </dl>
                </section>
              </div>

              {!readOnly && (
                /* 사유는 정해진 템플릿에서 고른다 — 판매자마다 다른 표현이 나가면 "무엇을 고치면 되는지"가
                    흔들리고, 사유별 집계도 불가능하다. 선택한 문구가 그대로 판매자에게 전달되므로
                    아래에 미리보기를 노출한다. */
                <fieldset className="mt-6 border-t border-border pt-5">
                <legend className="text-xs font-extrabold text-text-2">승인 거절 사유</legend>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {AUCTION_REJECTION_REASON_OPTIONS.map((option) => (
                    <label
                      key={option.code}
                      className={`flex cursor-pointer items-center gap-2 rounded-r2 border px-3 py-2 text-[13px] transition-colors ${
                        reasonCode === option.code
                          ? "border-accent bg-accent-soft font-bold text-accent"
                          : "border-border text-text-2 hover:border-text-2"
                      }`}
                    >
                      <input
                        type="radio"
                        name="verification-reject-reason"
                        value={option.code}
                        checked={reasonCode === option.code}
                        onChange={() => {
                          setReasonCode(option.code);
                          setError(null);
                        }}
                        className="h-3.5 w-3.5 shrink-0 accent-[var(--color-accent)]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {selectedReason && (
                  <p className="mt-3 border-l-2 border-border-2 bg-surface-2 px-3 py-2 text-[12px] leading-5 text-text-2">
                    <span className="font-extrabold text-text-3">판매자에게 전달될 문구 · </span>
                    {selectedReason.preview}
                  </p>
                )}
                {error && (
                  <p className="mt-2 text-xs text-accent" role="alert">{error}</p>
                )}
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {/* 헤더 닫기까지 스크롤을 올려야 했던 문제 — 액션 줄에도 닫기를 둔다. */}
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className={`h-11 border border-border-2 px-5 text-sm font-extrabold text-text-2 hover:border-text-2 hover:bg-surface-2 disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={reject}
                    disabled={submitting}
                    className={`h-11 border border-accent px-5 text-sm font-extrabold text-accent hover:bg-accent-soft disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    승인 거절
                  </button>
                  <button
                    type="button"
                    onClick={approve}
                    disabled={submitting}
                    className={`h-11 bg-ok px-7 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    {submitting ? "처리 중..." : "승인하고 공개"}
                  </button>
                </div>
                </fieldset>
              )}
            </>
          ) : null}
          {readOnly && !loading && (
            <div className="mt-6 flex justify-end border-t border-border pt-5">
              <button
                type="button"
                onClick={onClose}
                className={`h-11 border border-border-2 px-5 text-sm font-extrabold text-text-2 hover:border-text-2 hover:bg-surface-2 ${FOCUS_RING}`}
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
