"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { REVIEW_MANNER_TAGS } from "@/lib/labels";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";

// 당근마켓식 후기 작성/수정 모달(§12.6) — 별점(필수) + 긍정 매너 태그 칩(선택, 다중) + 자유 텍스트(선택).
// 구매확정 직후 곧바로 뜨는 "거래 어떠셨어요?" 진입점이자, 마이페이지 재작성/수정에도 공용으로 쓴다.
// reviewId가 있으면 수정(PATCH), 없으면 신규 작성(POST) — orderId로 자격은 서버가 검증한다.
export default function ReviewComposerModal({
  orderId,
  reviewId,
  title,
  sellerNickname,
  initialRating = 0,
  initialBody = "",
  initialTags = [],
  onClose,
  onSaved,
}: {
  orderId?: number;
  reviewId?: number;
  title: string;
  sellerNickname: string | null;
  initialRating?: number;
  initialBody?: string;
  initialTags?: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const isEdit = reviewId != null;

  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(code: string) {
    setTags((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function submit() {
    if (saving) return;
    if (rating < 1) {
      setError("별점을 선택해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await fetchWithAuth<void>(`/api/reviews/${reviewId}`, {
          method: "PATCH",
          body: { rating, tags, body: body.trim() || null },
        });
      } else {
        await fetchWithAuth<number>("/api/reviews", {
          method: "POST",
          body: { orderId, rating, tags, body: body.trim() || null },
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  const activeStars = hover || rating;
  const RATING_HINT = ["", "별로예요", "그저 그래요", "괜찮아요", "좋아요", "최고예요"];

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-r3 border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="거래 후기 작성"
      >
        <p className="text-sm font-bold text-text-1">
          {sellerNickname ? `${sellerNickname}님과의 거래는 어떠셨어요?` : "거래는 어떠셨어요?"}
        </p>
        <p className="mt-1 text-xs text-text-3">
          <b className="font-bold text-text-2">{title}</b> 거래 후기예요. 다른 구매자에게 큰 도움이 돼요.
        </p>

        {/* 별점 */}
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`별점 ${n}점`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className={`rounded-r2 p-0.5 text-3xl leading-none transition-colors ${FOCUS_RING} ${
                  n <= activeStars ? "text-[#f5b301]" : "text-border-2"
                }`}
              >
                {n <= activeStars ? "★" : "☆"}
              </button>
            ))}
          </div>
          <span className="h-4 text-xs font-semibold text-text-2">{RATING_HINT[activeStars] ?? ""}</span>
        </div>

        {/* 매너 태그 칩 */}
        <div className="mt-4">
          <p className="text-xs font-bold text-text-2">이런 점이 좋았어요 (선택)</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REVIEW_MANNER_TAGS.map((t) => {
              const on = tags.includes(t.code);
              return (
                <button
                  key={t.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTag(t.code)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${FOCUS_RING} ${
                    on
                      ? "border-primary bg-primary-soft/40 text-primary"
                      : "border-border-2 text-text-2 hover:border-text-3"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 자유 텍스트 */}
        <div className="mt-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="거래하며 느낀 점을 남겨주세요. (선택, 최대 500자)"
            className={`w-full resize-none rounded-r2 border border-border px-3 py-2.5 text-sm text-text-1 outline-none transition-colors placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
          />
          <p className="mt-0.5 text-right text-[11px] text-text-3">{body.length}/500</p>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-xs font-semibold text-accent">
            {error}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={`flex-1 py-2.5 ${PRIMARY_BUTTON_CLASS}`}
          >
            {saving ? "저장 중..." : isEdit ? "후기 수정" : "후기 등록"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`px-5 py-2.5 disabled:opacity-50 ${SECONDARY_BUTTON_CLASS}`}
          >
            {isEdit ? "취소" : "다음에"}
          </button>
        </div>
      </div>
    </div>
  );
}
