"use client";

import { useEffect, useState } from "react";
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

function ResultValue({
  value,
  label,
  score,
  description,
}: {
  value: boolean | null;
  label: string;
  score?: number | null;
  description?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const passed = value === true;
  const percentage = value == null ? null : score == null ? (value ? 100 : 0) : score * 100;
  return (
    <div className="border-b border-border py-2 last:border-0">
      <div className="flex items-center justify-between gap-3">
        {description ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className={`text-left text-xs text-text-2 underline decoration-dotted underline-offset-4 hover:text-primary ${FOCUS_RING}`}
          >
            {label}
          </button>
        ) : (
          <span className="text-xs text-text-2">{label}</span>
        )}
        <span className={`text-xs font-extrabold ${value === null ? "text-text-3" : passed ? "text-ok" : "text-accent"}`}>
          {percentage === null ? "미분석" : `${percentage.toFixed(percentage % 1 === 0 ? 0 : 1)}%`}
        </span>
      </div>
      {description && expanded && (
        <p className="mt-2 bg-surface-2 px-3 py-2 text-[11px] leading-5 text-text-3">{description}</p>
      )}
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
            <h2 id="verification-review-title" className="truncate font-display text-lg font-extrabold text-text-1">
              사진 인증 검수
            </h2>
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
          {loading ? (
            <p className="py-16 text-center text-sm text-text-3">인증 자료를 불러오는 중...</p>
          ) : error && !verification ? (
            <p className="bg-accent-soft px-4 py-3 text-sm text-accent" role="alert">{error}</p>
          ) : verification ? (
            <>
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
                  <div className="mt-2">
                    <ResultValue
                      label="기본 이미지 품질 (참고)"
                      value={verification.qualityPassed}
                      description="사진의 해상도, 밝기, 흔들림과 초점 상태를 규칙 기반으로 확인한 참고값입니다. 인증 성공 여부를 직접 결정하지 않으며 관리자가 원본 사진과 함께 판단합니다."
                    />
                    <ResultValue
                      label="코드 영역 탐지"
                      value={verification.codeRegionDetected}
                      score={verification.codeRegionScore}
                    />
                    <ResultValue label="발급 코드 정확히 일치" value={verification.codeExact} />
                    <ResultValue
                      label="판매 물품 형태 확인"
                      value={verification.cardPresent}
                      score={verification.cardScore}
                    />
                    <ResultValue label="합성 위험도 분석" value={null} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <dt className="text-text-3">분석 모델</dt>
                    <dd className="truncate text-right font-bold text-text-2" title={verification.modelVersion ?? undefined}>
                      {verification.modelVersion ?? "—"}
                    </dd>
                  </dl>
                </section>
              </div>

              {/* 사유는 정해진 템플릿에서 고른다 — 판매자마다 다른 표현이 나가면 "무엇을 고치면 되는지"가
                  흔들리고, 사유별 집계도 불가능하다. 선택한 문구가 그대로 판매자에게 전달되므로
                  아래에 미리보기를 노출한다. */}
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
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
