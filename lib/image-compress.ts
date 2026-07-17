// 업로드 전 클라이언트 이미지 압축(상한 리사이즈 + JPEG 재인코딩).
// 서버(ImageProcessor)가 최종 3단계 리사이즈를 하므로, 여기선 "대역폭 절감용 상한 리사이즈"만 담당한다.
// EXIF 방향은 createImageBitmap의 imageOrientation="from-image"로 디코드 시 baking해 회전이 꼬이지 않는다.
// (서버도 방향 baking하지만 클라 출력은 이미 정방향 JPEG(orientation=1)이라 이중 회전 없음)
// 어떤 이유로든 실패하면 원본 File을 그대로 반환한다 — 압축이 업로드를 절대 깨뜨리지 않게.

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type CompressOptions = {
  maxEdge?: number; // 긴 변 상한(px). 기본 2560 = 서버 master 상한과 동일
  quality?: number; // JPEG 품질 0~1. 기본 0.82
};

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const maxEdge = opts.maxEdge ?? 2560;
  const quality = opts.quality ?? 0.82;

  // 허용 밖 타입/환경 미지원이면 그대로 반환(타입 판단은 서버에 위임).
  if (!ALLOWED_TYPES.includes(file.type)) return file;
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.fillStyle = "#ffffff"; // PNG 투명 영역이 JPEG에서 검게 나오지 않도록 흰 배경.
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
    // 못 줄였으면(작은 원본 등) 원본 유지.
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^./\\]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}
