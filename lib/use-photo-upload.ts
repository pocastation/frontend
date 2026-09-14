"use client";

import { useCallback, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { compressImage } from "@/lib/image-compress";
import type { PhotoItem } from "@/components/PhotoUploadGrid";
import type { MediaUploadResponse } from "@/lib/types";

/**
 * `PhotoUploadGrid`를 쓰는 화면의 업로드 상태·핸들러(#647).
 *
 * 매물 등록에만 있던 로직을 반품 요청·자료 보완이 함께 쓰도록 뺐다. 복사하면 한쪽만 고치는
 * 일이 생긴다 — 실제로 토큰 만료 재시도(#269)와 업로드 전 리사이즈가 여기 들어 있고, 둘 중
 * 하나라도 빠진 구현이 돌면 같은 증상을 두 번 디버깅한다.
 *
 * `fetchMultipartWithAuth`를 쓰는 이유: 401이면 리프레시 후 재시도한다. 액세스 토큰이 30분인데
 * 사진을 여러 장 올리는 동안 만료되는 일이 실제로 있다.
 */
export function usePhotoUpload(max: number, onError?: (message: string) => void) {
  const { accessToken, fetchMultipartWithAuth } = useAuth();
  const [items, setItems] = useState<PhotoItem[]>([]);

  const addFiles = useCallback(
    (files: File[]) => {
      if (!accessToken) return;
      const picked = files.slice(0, max - items.length);
      if (picked.length === 0) return;
      const newItems: PhotoItem[] = picked.map((file) => ({
        id: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(file),
        status: "uploading",
      }));
      setItems((prev) => [...prev, ...newItems]);
      newItems.forEach((it, i) => {
        const file = picked[i];
        void (async () => {
          try {
            const compressed = await compressImage(file); // 업로드 전 상한 리사이즈(대역폭 절감)
            const formData = new FormData();
            formData.append("file", compressed);
            const uploaded = await fetchMultipartWithAuth<MediaUploadResponse>("/api/media/images", formData);
            setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "done", uploaded } : x)));
          } catch (err) {
            const message = photoUploadErrorMessage(err);
            setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "error", error: message } : x)));
            // 타일은 좁아서 사유를 다 못 보여준다 — 폼에 한 번 띄운다. 이게 없으면 사용자도
            // 우리도 「업로드 실패」 네 글자만 보고 원인을 추측하게 된다.
            onError?.(message);
          }
        })();
      });
    },
    [accessToken, fetchMultipartWithAuth, items.length, max, onError],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const reset = useCallback(() => {
    setItems((prev) => {
      prev.forEach((x) => URL.revokeObjectURL(x.previewUrl));
      return [];
    });
  }, []);

  /** 서버로 보낼 URL 쌍 — 업로드가 끝난 것만. display 변형은 반품 사진에 쓰지 않는다. */
  const uploadedUrls = items
    .filter((x) => x.status === "done" && x.uploaded)
    .map((x) => ({ url: x.uploaded!.url, thumbnailUrl: x.uploaded!.thumbnailUrl }));

  return {
    items,
    setItems,
    addFiles,
    removeItem,
    reset,
    uploadedUrls,
    /** 업로드 중인 장이 있는가 — 제출 버튼을 잠그는 근거다. */
    uploading: items.some((x) => x.status === "uploading"),
  };
}

export function photoUploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "로그인이 만료돼 사진을 올리지 못했어요. 다시 로그인한 뒤 이어서 시도해 주세요.";
    }
    return err.message;
  }
  return "사진 업로드에 실패했어요. 잠시 후 다시 시도해 주세요.";
}
