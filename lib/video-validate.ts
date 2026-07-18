// 검수영상 업로드 전 클라이언트 사전 검증 — 서버 낭비/실패를 줄이려는 1차 게이트.
// 코덱 정규화(아이폰 HEVC 등)는 서버 MediaConvert가 하므로 여기서 재생 가능 여부(canPlayType)는 막지 않는다.
// 포맷(컨테이너)·용량은 즉시 판정, 길이는 메타데이터를 읽을 수 있을 때만(HEVC는 브라우저가 못 읽어 skip) 검사한다.

export const MAX_VIDEO_SIZE_MB = 50;
export const MAX_VIDEO_DURATION_SEC = 60;
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export type VideoValidationResult = { ok: true } | { ok: false; reason: string };

export async function validateVideo(file: File): Promise<VideoValidationResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, reason: "MP4·MOV·WebM 형식의 영상만 올릴 수 있어요." };
  }
  if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    return { ok: false, reason: `영상 용량은 ${MAX_VIDEO_SIZE_MB}MB 이하여야 해요.` };
  }

  const duration = await readDurationSeconds(file);
  if (duration != null && duration > MAX_VIDEO_DURATION_SEC) {
    return { ok: false, reason: `영상 길이는 ${MAX_VIDEO_DURATION_SEC}초 이하여야 해요.` };
  }
  return { ok: true };
}

// 메타데이터를 읽어 길이를 반환. 브라우저가 디코드 못 하거나(HEVC 등) 실패하면 null(=검사 스킵).
function readDurationSeconds(file: File): Promise<number | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
    };
    video.onloadedmetadata = () => {
      const d = Number.isFinite(video.duration) ? video.duration : null;
      cleanup();
      resolve(d);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
}
