"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import PhotoUploadGrid from "@/components/PhotoUploadGrid";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import { RETURN_PHOTO_MAX } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { DisputePhotoListResponse } from "@/lib/types";

/**
 * 자료 보완 제출(#647).
 *
 * <p>예전에는 {@code window.prompt}로 글만 받았다. 보완을 요청하는 이유가 「자료가 부족하다」인데
 * 글만 더 받으면 보완의 의미가 약하다 — 사진을 함께 받는다.
 *
 * <p>목록 행 안에서 펼친다. 모달로 띄우지 않는 이유는 이 단계가 <b>이미 열린 분쟁의 후속</b>
 * 이라서다 — 행이 맥락을 들고 있고, 모달은 그 맥락을 가린다.
 *
 * <p>남은 장수를 서버에서 받아 보여준다. 주문당 6장이 요청과 보완을 합친 천장이라, 요청 때
 * 몇 장을 썼는지 모르면 올리고 나서 거절당한다.
 */
export default function ReturnEvidenceForm({
  auctionId,
  onClose,
  onDone,
}: {
  auctionId: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(RETURN_PHOTO_MAX);
  const photos = usePhotoUpload(remaining, setError);

  useEffect(() => {
    let alive = true;
    fetchWithAuth<DisputePhotoListResponse>(`/api/auctions/${auctionId}/order/return/photos`)
      .then((res) => {
        if (!alive || !res) return;
        setUsed(res.photos.length);
        setRemaining(res.remaining);
      })
      .catch(() => {
        // 못 읽어도 제출 자체는 막지 않는다 — 상한은 서버가 최종 판정한다.
        if (alive) setUsed(null);
      });
    return () => {
      alive = false;
    };
  }, [auctionId, fetchWithAuth]);

  async function submit() {
    if (saving) return;
    const trimmed = note.trim();
    if (!trimmed && photos.uploadedUrls.length === 0) {
      setError("보완할 설명이나 사진을 넣어 주세요.");
      return;
    }
    if (photos.uploading) {
      setError("사진 업로드가 끝난 뒤에 제출해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/auctions/${auctionId}/order/return/evidence`, {
        method: "POST",
        body: { note: trimmed || null, images: photos.uploadedUrls },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "자료를 제출하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2 rounded-r2 border border-border bg-surface p-3">
      {remaining > 0 ? (
        <>
          <PhotoUploadGrid
            items={photos.items}
            max={remaining}
            onAddFiles={photos.addFiles}
            onRemove={photos.removeItem}
            onReorder={photos.setItems}
          />
          <p className="text-[11px] text-text-3">
            {used === null
              ? `사진은 ${RETURN_PHOTO_MAX}장까지 올릴 수 있어요`
              : `${used}장 올렸어요 · ${remaining}장 더 올릴 수 있어요`}
          </p>
        </>
      ) : (
        <p className="text-[11px] text-text-3">
          사진 {RETURN_PHOTO_MAX}장을 모두 올렸어요 · 설명으로 보완해 주세요
        </p>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 500))}
        rows={3}
        placeholder="운영팀이 요청한 내용을 적어주세요."
        className={`w-full resize-none rounded-r2 border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 ${FOCUS_RING}`}
      />
      {error && (
        <p role="alert" className="text-[12px] font-semibold text-accent">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className={`shrink-0 rounded-r2 border border-border-2 bg-surface px-3 py-1.5 text-[11px] font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 ${FOCUS_RING}`}
        >
          닫기
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className={`shrink-0 rounded-r2 bg-text-1 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-text-2 disabled:opacity-60 ${FOCUS_RING}`}
        >
          자료 제출
        </button>
      </div>
    </div>
  );
}
