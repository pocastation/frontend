"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { compressImage } from "@/lib/image-compress";

export type InquiryAttachment = { id: string; kind: "PHOTO" | "VIDEO" };
type Kind = InquiryAttachment["kind"];
type Upload = {
  key: string;
  kind: Kind;
  file: File;
  preview: string;
  status: "uploading" | "ready" | "failed";
  uploaded?: InquiryAttachment;
  error?: string;
};

export const INQUIRY_ATTACHMENT_RULES = {
  PHOTO: { max: 5, mb: 20, types: ["image/jpeg", "image/png", "image/webp"] },
  VIDEO: { max: 1, mb: 50, types: ["video/mp4", "video/quicktime", "video/webm"] },
};

const UPLOAD_PATH = "/api/inquiries/attachments";

export function useInquiryAttachments() {
  const { fetchMultipartWithAuth, fetchWithAuth } = useAuth();
  const [items, setItems] = useState<Upload[]>([]);
  const [selectionError, setSelectionError] = useState("");
  const live = useRef<Upload[]>([]);
  const discard = useCallback((id: string) => {
    // 서버의 만료 정리가 화면 종료 직전의 요청 실패도 처리한다.
    void fetchWithAuth(`${UPLOAD_PATH}/${id}`, { method: "DELETE" }).catch(() => {});
  }, [fetchWithAuth]);

  useEffect(() => () => {
    for (const item of live.current) {
      URL.revokeObjectURL(item.preview);
    }
    live.current = [];
  }, []);

  function replace(next: Upload[]) {
    live.current = next;
    setItems(next);
  }

  async function upload(item: Upload) {
    replace(live.current.map((current) => current.key === item.key
      ? { ...current, status: "uploading", error: undefined }
      : current));
    try {
      const file = item.kind === "PHOTO" ? await compressImage(item.file) : item.file;
      if (!live.current.some((current) => current.key === item.key)) return;
      const body = new FormData();
      body.append("file", file);
      const uploaded = await fetchMultipartWithAuth<InquiryAttachment>(UPLOAD_PATH, body);
      if (!live.current.some((current) => current.key === item.key)) {
        discard(uploaded.id);
        return;
      }
      replace(live.current.map((current) => current.key === item.key
        ? { ...current, status: "ready", uploaded }
        : current));
    } catch (error) {
      if (!live.current.some((current) => current.key === item.key)) return;
      const message = error instanceof ApiError ? error.message : "파일을 올리지 못했어요. 다시 시도해 주세요.";
      replace(live.current.map((current) => current.key === item.key
        ? { ...current, status: "failed", error: message }
        : current));
    }
  }

  function add(kind: Kind, files: FileList | null) {
    if (!files?.length) return;
    setSelectionError("");
    const rule = INQUIRY_ATTACHMENT_RULES[kind];
    const remaining = rule.max - live.current.filter((item) => item.kind === kind).length;
    const valid: File[] = [];
    for (const file of files) {
      if (!rule.types.includes(file.type) || !file.size) {
        setSelectionError(kind === "PHOTO" ? "JPG·PNG·WebP 사진을 선택해 주세요." : "MP4·MOV·WebM 동영상을 선택해 주세요.");
      } else if (file.size > rule.mb * 1024 * 1024) {
        setSelectionError(`파일은 ${rule.mb}MB 이하여야 해요.`);
      } else {
        valid.push(file);
      }
    }
    if (valid.length > remaining) {
      setSelectionError(kind === "PHOTO" ? "사진은 5장까지 첨부할 수 있어요." : "동영상은 1개까지 첨부할 수 있어요.");
    }
    const added = valid.slice(0, remaining).map((file): Upload => ({
      key: crypto.randomUUID(), kind, file, preview: URL.createObjectURL(file), status: "uploading",
    }));
    replace([...live.current, ...added]);
    void (async () => {
      // 사진을 여러 장 골라도 한 번에 한 장만 압축·전송한다.
      for (const item of added) {
        if (live.current.some((current) => current.key === item.key)) await upload(item);
      }
    })();
  }

  function remove(key: string) {
    const item = live.current.find((current) => current.key === key);
    if (!item) return;
    URL.revokeObjectURL(item.preview);
    if (item.uploaded) discard(item.uploaded.id);
    replace(live.current.filter((current) => current.key !== key));
    setSelectionError("");
  }

  function retry(key: string) {
    const item = live.current.find((current) => current.key === key);
    if (item?.status === "failed") void upload(item);
  }

  return {
    items, selectionError, add, remove, retry,
    uploading: items.some((item) => item.status === "uploading"),
    hasFailed: items.some((item) => item.status === "failed"),
    ids: items.flatMap((item) => item.uploaded ? [item.uploaded.id] : []),
  };
}
