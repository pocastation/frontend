"use client";

import { useRef, useState } from "react";
import { FOCUS_RING } from "@/lib/ui";
import {
  MAX_VIDEO_DURATION_SEC,
  MAX_VIDEO_SIZE_MB,
  MIN_VIDEO_DURATION_SEC,
} from "@/lib/video-validate";

// 검수영상 슬롯 한 개의 상태. previewUrl은 로컬 object URL(즉시 프리뷰), 서버 트랜스코딩과 별개.
//
// #466 — 업로드 진행률(XHR)과 READY 산출물(url·posterUrl)을 함께 든다. HEVC 원본은 브라우저가
// 못 읽어 previewUrl이 검은 화면이 되므로, READY 후에는 서버 정지컷·변환 MP4가 화면을 맡는다.
export type VideoItem = {
  previewUrl: string;
  status: "uploading" | "processing" | "ready" | "error";
  error?: string;
  /** 업로드 진행(XHR) — uploading일 때만 채워진다. */
  uploadedBytes?: number;
  totalBytes?: number;
  /** READY 산출물 — 변환된 재생용 MP4와 정지컷. 로컬 패스스루는 posterUrl이 없을 수 있다. */
  url?: string | null;
  posterUrl?: string | null;
};

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

const ACCEPT = "video/mp4,video/quicktime,video/webm";

type Props = {
  video: VideoItem | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

// 영상 1개 첨부 슬롯 — 사진 그리드와 달리 단일 슬롯이고, 업로드 후 서버 트랜스코딩을 기다리는 상태를 보여준다.
export default function VideoUploadField({ video, onSelect, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // READY 정지컷 위에서 ▶를 누르면 변환된 MP4를 controls로 재생한다.
  const [playing, setPlaying] = useState(false);

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
        {/* 규칙 문구는 검증 상수에서 그대로 만든다 — 문구와 실제 판정이 어긋나면 그게 더 나쁘다. */}
        <span className="text-[11px]">
          MP4·MOV·WebM · {MIN_VIDEO_DURATION_SEC}~{MAX_VIDEO_DURATION_SEC}초 · {MAX_VIDEO_SIZE_MB}MB 이하
        </span>
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

  const progressPercent =
    video.status === "uploading" && video.totalBytes
      ? Math.min(100, Math.round(((video.uploadedBytes ?? 0) / video.totalBytes) * 100))
      : null;
  // READY면 변환된 MP4가 정본이다 — HEVC 원본(previewUrl)은 브라우저가 검은 화면으로 그린다.
  const playSrc = video.status === "ready" && video.url ? video.url : video.previewUrl;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-r2 border border-border bg-black">
      {video.status === "ready" && !playing && video.posterUrl ? (
        // 정지컷이 있으면 video 태그 대신 이미지 — 로드가 즉각이고 코덱과 무관하게 항상 보인다.
        // eslint-disable-next-line @next/next/no-img-element -- 서버 산출 정지컷, 크기 고정 슬롯.
        <img src={video.posterUrl} alt="검수영상 정지컷" className="h-full w-full object-contain" />
      ) : (
        <video
          src={playSrc}
          muted={!playing}
          playsInline
          controls={playing}
          autoPlay={playing}
          preload="metadata"
          className="h-full w-full object-contain"
        />
      )}

      {video.status === "uploading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white">
          {progressPercent != null ? (
            <>
              <span className="font-display text-lg font-bold tabular-nums">{progressPercent}%</span>
              <span className="text-[10.5px] text-white/70 tabular-nums">
                업로드 중 · {formatMb(video.uploadedBytes ?? 0)} / {formatMb(video.totalBytes ?? 0)}
              </span>
            </>
          ) : (
            <span className="text-xs">업로드 중…</span>
          )}
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20" aria-hidden="true">
            <span className="block h-full bg-primary" style={{ width: `${progressPercent ?? 0}%` }} />
          </span>
        </div>
      )}
      {video.status === "processing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 text-white">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          <span className="text-xs">영상 처리 중…</span>
          {/* 폼이 잠긴 게 아니라는 걸 문구가 말해준다 — 등록 버튼만 처리 완료를 기다린다. */}
          <span className="text-[10px] text-white/60">그동안 다른 항목을 계속 작성하셔도 돼요</span>
        </div>
      )}
      {video.status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-3 text-center text-xs text-white">
          {video.error ?? "영상 처리에 실패했어요"}
        </div>
      )}
      {video.status === "ready" && (
        <>
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[3px] bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            처리 완료
          </span>
          {!playing && (
            <button
              type="button"
              aria-label="검수영상 재생"
              onClick={() => setPlaying(true)}
              className={`absolute inset-0 flex items-center justify-center ${FOCUS_RING}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 pl-0.5 text-[15px] text-white">
                ▶
              </span>
            </button>
          )}
        </>
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
