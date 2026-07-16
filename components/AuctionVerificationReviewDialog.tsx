"use client";

import { useEffect, useState } from "react";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";
import type {
  AdminAuctionSummary,
  AdminAuctionVerificationResponse,
  AuctionImageResponse,
} from "@/lib/types";

type Props = {
  auction: AdminAuctionSummary;
  onClose: () => void;
  onReviewed: (message: string) => Promise<void>;
};

function ResultValue({
  value,
  label,
  advisory = false,
  description,
}: {
  value: boolean | null;
  label: string;
  advisory?: boolean;
  description?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const passed = value === true;
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
          {value === null ? "미분석" : passed ? "통과" : advisory ? "주의" : "실패"}
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
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [detail, images] = await Promise.all([
          fetchWithAuth<AdminAuctionVerificationResponse>(`/api/admin/auctions/${auction.id}/verification`),
          fetchWithAuth<AuctionImageResponse[]>(`/api/admin/auctions/${auction.id}/images`),
        ]);
        if (!active) return;
        setVerification(detail);
        setPublicImages(images);
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
    if (!reason.trim()) {
      setError("반려 사유를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/admin/auctions/${auction.id}/reject`, {
        method: "PATCH",
        body: { reason: reason.trim() },
      });
      await onReviewed(`"${auction.title}"을(를) 반려했습니다.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "반려에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-review-title"
    >
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-r3 bg-surface shadow-modal sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-surface px-5 py-4">
          <div className="min-w-0">
            <h2 id="verification-review-title" className="truncate font-display text-lg font-extrabold text-text-1">
              사진 인증 검수
            </h2>
            <p className="mt-0.5 truncate text-xs text-text-3">{auction.title} · {auction.sellerNickname ?? "판매자 미상"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="검수 창 닫기"
            className={`flex h-9 w-9 shrink-0 items-center justify-center text-2xl text-text-3 hover:text-text-1 disabled:opacity-50 ${FOCUS_RING}`}
          >
            ×
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
                      advisory
                      description="사진의 해상도, 밝기, 흔들림과 초점 상태를 규칙 기반으로 확인한 참고값입니다. 인증 성공 여부를 직접 결정하지 않으며 관리자가 원본 사진과 함께 판단합니다."
                    />
                    <ResultValue label="코드 영역 탐지" value={verification.codeRegionDetected} />
                    <ResultValue label="발급 코드 정확히 일치" value={verification.codeExact} />
                    <ResultValue label="판매 물품 형태 확인" value={verification.cardPresent} />
                    <ResultValue label="합성 위험도 분석" value={null} advisory />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <dt className="text-text-3">코드 영역 점수</dt>
                    <dd className="text-right font-bold text-text-2">{verification.codeRegionScore?.toFixed(3) ?? "—"}</dd>
                    <dt className="text-text-3">물품 형태 점수</dt>
                    <dd className="text-right font-bold text-text-2">{verification.cardScore?.toFixed(3) ?? "—"}</dd>
                    <dt className="text-text-3">분석 모델</dt>
                    <dd className="truncate text-right font-bold text-text-2" title={verification.modelVersion ?? undefined}>
                      {verification.modelVersion ?? "—"}
                    </dd>
                  </dl>
                </section>
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <label htmlFor="verification-reject-reason" className="text-xs font-extrabold text-text-2">
                  반려 사유
                </label>
                <textarea
                  id="verification-reject-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="반려할 때 판매자에게 전달할 사유를 입력하세요."
                  className={`mt-2 w-full resize-none rounded-r2 border border-border px-3 py-2 text-sm outline-none focus:border-primary ${FOCUS_RING}`}
                />
                {error && (
                  <p className="mt-2 text-xs text-accent" role="alert">{error}</p>
                )}
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={reject}
                    disabled={submitting}
                    className={`h-11 border border-accent px-5 text-sm font-extrabold text-accent hover:bg-accent-soft disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    반려
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
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
