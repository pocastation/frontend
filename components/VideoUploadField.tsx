"use client";

import { useRef } from "react";
import { FOCUS_RING } from "@/lib/ui";

// 검수영상 슬롯 한 개의 상태. previewUrl은 로컬 object URL(즉시 프리뷰), 서버 트랜스코딩과 별개.
export type VideoItem = {
  previewUrl: string;
  status: "uploading" | "processing" | "ready" | "error";
  error?: string;
};

const ACCEPT = "video/mp4,video/quicktime,video/webm";

type Props = {
  video: VideoItem | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

// 영상 1개 첨부 슬롯 — 사진 그리드와 달리 단일 슬롯이고, 업로드 후 서버 트랜스코딩을 기다리는 상태를 보여준다.
export default function VideoUploadField({ video, onSelect, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(fileList: FileList | null) {
    const file = fileList?.[0];
    if (file) onSelect(file);
  }

  if (!video) {
    return (
      <label
        className={`flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-r2 border border-dashed border-border-2 text-text-3 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
      >
        <span className="text-2xl leading-none" aria-hidden="true">
          +
        </span>
        <span className="text-xs font-semibold">영상 선택</span>
        <span className="text-[11px]">MP4·MOV·WebM · 60초 · 50MB 이하</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
          className="sr-only"
        />
      </label>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-r2 border border-border bg-black">
      {/* muted+playsInline 로컬 프리뷰. 코덱 미지원(HEVC 등)이면 검은 화면이지만 처리 후 재생은 정상. */}
      <video
        src={video.previewUrl}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
      />

      {(video.status === "uploading" || video.status === "processing") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-xs text-white">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          {video.status === "uploading" ? "업로드 중…" : "영상 처리 중…"}
        </div>
      )}
      {video.status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-3 text-center text-xs text-white">
          {video.error ?? "영상 처리에 실패했어요"}
        </div>
      )}
      {video.status === "ready" && (
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[3px] bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          처리 완료
        </span>
      )}

      <button
        type="button"
        aria-label="영상 삭제"
        onClick={onRemove}
        className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm text-white transition-transform hover:scale-110 active:scale-95 ${FOCUS_RING}`}
      >
        ×
      </button>
    </div>
  );
}
