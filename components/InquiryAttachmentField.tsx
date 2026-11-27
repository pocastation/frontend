"use client";

import { useId, useRef, useState } from "react";
import { FOCUS_RING } from "@/lib/ui";
import { INQUIRY_ATTACHMENT_RULES, type useInquiryAttachments } from "@/lib/use-inquiry-attachments";

type Upload = ReturnType<typeof useInquiryAttachments>["items"][number];
const actionClass = `min-h-11 rounded-control px-2 text-label font-bold text-text-2 hover:text-primary ${FOCUS_RING}`;

export default function InquiryAttachmentField({ attachments, disabled }: {
  attachments: ReturnType<typeof useInquiryAttachments>;
  disabled: boolean;
}) {
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const heading = useId();
  const photos = attachments.items.filter((item) => item.kind === "PHOTO");
  const video = attachments.items.find((item) => item.kind === "VIDEO");
  const preview = attachments.items.find((item) => item.key === previewKey);

  function actions(item: Upload) {
    return (
      <div className="flex items-center">
        {item.status === "failed" && (
          <button type="button" className={actionClass} disabled={disabled} onClick={() => attachments.retry(item.key)}>
            재시도
          </button>
        )}
        <button type="button" className={actionClass} disabled={disabled} aria-label={`${item.file.name} 삭제`}
          onClick={() => {
            if (previewKey === item.key) setPreviewKey(null);
            attachments.remove(item.key);
          }}>
          삭제
        </button>
      </div>
    );
  }

  return (
    <section aria-labelledby={heading} className="space-y-3 rounded-card border border-border bg-surface-2 p-3 sm:p-4">
      <div className="flex items-baseline gap-2">
        <h2 id={heading} className="text-body font-extrabold text-text-1">첨부파일</h2>
        <span className="text-label text-text-3">선택</span>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-body-s font-bold text-text-1">사진 <span className="tabular-nums text-primary">{photos.length}/5</span></span>
          <span className="text-label text-text-3">JPG·PNG·WebP · 장당 최대 20MB</span>
        </div>
        <input ref={photoInput} hidden type="file" aria-label="문의 사진 선택" multiple
          accept={INQUIRY_ATTACHMENT_RULES.PHOTO.types.join(",")} onChange={(event) => {
            attachments.add("PHOTO", event.currentTarget.files);
            event.currentTarget.value = "";
          }} />
        <div className="flex flex-wrap gap-2">
          {photos.map((item, index) => (
            <div key={item.key} className="flex w-20 flex-col items-center">
              <button type="button" onClick={() => setPreviewKey(item.key)} aria-label={`사진 ${index + 1} 미리보기`}
                className={`h-16 w-full overflow-hidden rounded-control border border-border bg-surface ${FOCUS_RING}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 업로드 전 브라우저의 Blob 미리보기 */}
                <img src={item.preview} alt="" className="h-full w-full object-cover" />
              </button>
              {item.status !== "ready" && (
                <span role="status" className={`mt-1 text-caption ${item.status === "failed" ? "text-danger" : "text-text-3"}`}>
                  {item.status === "failed" ? "첨부 실패" : "첨부 중…"}
                </span>
              )}
              {actions(item)}
            </div>
          ))}
          {photos.length < INQUIRY_ATTACHMENT_RULES.PHOTO.max && (
            <button type="button" disabled={disabled} onClick={() => photoInput.current?.click()}
              className={`h-16 w-20 rounded-control border border-dashed border-border-2 bg-surface text-label font-bold text-primary hover:border-primary ${FOCUS_RING}`}>
              사진 추가
            </button>
          )}
        </div>
        {photos.filter((item) => item.error).map((item) => (
          <p key={item.key} role="alert" className="mt-1 break-words text-label text-danger">{item.file.name} · {item.error}</p>
        ))}
      </div>

      <div className="border-t border-border pt-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-body-s font-bold text-text-1">동영상 <span className="tabular-nums text-primary">{video ? 1 : 0}/1</span></span>
          <span className="text-label text-text-3">MP4·MOV·WebM · 최대 50MB / 30초</span>
        </div>
        <input ref={videoInput} hidden type="file" aria-label="문의 동영상 선택"
          accept={INQUIRY_ATTACHMENT_RULES.VIDEO.types.join(",")} onChange={(event) => {
            attachments.add("VIDEO", event.currentTarget.files);
            event.currentTarget.value = "";
          }} />
        {video ? (
          <div className="flex items-center gap-2 rounded-control border border-border bg-surface px-2">
            <button type="button" className={`${actionClass} shrink-0`} onClick={() => setPreviewKey(video.key)}>보기</button>
            <div className="min-w-0 flex-1 py-2">
              <p className="break-all text-label font-bold text-text-1">{video.file.name}</p>
              <p role="status" className={`text-caption ${video.status === "failed" ? "text-danger" : "text-text-3"}`}>
                {video.error ?? (video.status === "uploading" ? "영상 처리 중…" : "첨부 완료")}
              </p>
            </div>
            {actions(video)}
          </div>
        ) : (
          <button type="button" disabled={disabled} onClick={() => videoInput.current?.click()}
            className={`min-h-11 w-full rounded-control border border-dashed border-border-2 bg-surface text-body-s font-bold text-primary hover:border-primary ${FOCUS_RING}`}>
            동영상 추가
          </button>
        )}
      </div>

      {preview && (
        <div className="space-y-2 rounded-control border border-border bg-surface p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="break-all text-label font-bold text-text-2">{preview.file.name}</span>
            <button type="button" className={`${actionClass} shrink-0`} onClick={() => setPreviewKey(null)}>닫기</button>
          </div>
          {preview.kind === "PHOTO" ? (
            // eslint-disable-next-line @next/next/no-img-element -- 업로드 전 브라우저의 Blob 미리보기
            <img src={preview.preview} alt="첨부 사진 미리보기" className="mx-auto max-h-80 max-w-full object-contain" />
          ) : (
            <video src={preview.preview} aria-label="첨부 동영상 미리보기" controls muted playsInline
              className="mx-auto max-h-80 max-w-full" />
          )}
        </div>
      )}
      {attachments.selectionError && <p role="alert" className="text-label text-danger">{attachments.selectionError}</p>}
      <p className="text-label text-text-3">첨부는 작성자와 운영팀만 볼 수 있어요. 민감한 개인정보는 가려 주세요.</p>
      <p className="text-label text-text-3">동영상은 소리 없이 저장돼요.</p>
    </section>
  );
}
