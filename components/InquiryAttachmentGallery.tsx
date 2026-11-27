"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";
import type { InquiryAttachment } from "@/lib/use-inquiry-attachments";

const previewButton = `min-h-11 rounded-control border border-border bg-surface px-3 text-label font-bold text-text-2 hover:border-primary ${FOCUS_RING}`;

export default function InquiryAttachmentGallery({ inquiryId, admin = false }: { inquiryId: number; admin?: boolean }) {
  const { fetchWithAuth } = useAuth();
  const prefix = admin ? "/api/admin/inquiries" : "/api/members/me/inquiries";
  const path = `${prefix}/${inquiryId}/attachments`;
  const [result, setResult] = useState<{ path: string; files: InquiryAttachment[] | null }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchWithAuth<InquiryAttachment[]>(path).then(
      (files) => { if (active) setResult({ path, files }); },
      () => { if (active) setResult({ path, files: null }); },
    );
    return () => { active = false; };
  }, [fetchWithAuth, path, attempt]);

  if (result?.path !== path || result.files?.length === 0) return null;
  if (!result.files) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2 text-label text-text-2">
        <span role="status">첨부 목록을 불러오지 못했어요.</span>
        <button className={previewButton} type="button" onClick={() => {
          setResult(undefined);
          setAttempt((value) => value + 1);
        }}>다시 시도</button>
      </div>
    );
  }

  return (
    <section aria-label="첨부파일" className="mt-4 border-t border-border pt-4">
      <p className="mb-2 text-body-s font-bold text-text-1">첨부파일 {result.files.length}개</p>
      <div className="flex flex-wrap gap-2">
        {result.files.map((file, index) => (
          <PrivateInquiryPreview key={file.id} file={file} path={`${path}/${file.id}`}
            label={file.kind === "PHOTO" ? `첨부 사진 ${index + 1}` : "첨부 동영상"} />
        ))}
      </div>
    </section>
  );
}

function PrivateInquiryPreview({ file, path, label }: { file: InquiryAttachment; path: string; label: string }) {
  const { fetchBlobWithAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ url?: string; failed?: boolean }>();
  const [attempt, setAttempt] = useState(0);
  const photo = file.kind === "PHOTO";
  const load = photo || open;

  useEffect(() => {
    if (!load) return;
    let active = true;
    let url: string | undefined;
    void fetchBlobWithAuth(path).then((blob) => {
      if (!active) return;
      url = URL.createObjectURL(blob);
      setState({ url });
    }, () => {
      if (active) setState({ failed: true });
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [load, fetchBlobWithAuth, path, attempt]);

  if (open) {
    return (
      <div className="w-full rounded-control border border-border p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-label font-bold text-text-2">{label}</span>
          <button className={previewButton} type="button" onClick={() => {
            if (!photo) setState(undefined);
            setOpen(false);
          }}>닫기</button>
        </div>
        {state?.url && (photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- 인증된 비공개 Blob 파일
          <img src={state.url} alt={label} className="mx-auto max-h-96 max-w-full object-contain" />
        ) : (
          <video src={state.url} aria-label={label} controls playsInline className="mx-auto max-h-96 max-w-full" />
        ))}
        {state?.failed && (
          <button className={previewButton} type="button" onClick={() => {
            setState(undefined);
            setAttempt((value) => value + 1);
          }}>첨부파일 다시 불러오기</button>
        )}
        {!state && <p role="status" className="text-label text-text-3">첨부파일을 불러오는 중이에요.</p>}
      </div>
    );
  }

  return (
    <button type="button" aria-label={`${label} 보기`} onClick={() => setOpen(true)}
      className={photo && state?.url ? `h-16 w-20 overflow-hidden rounded-control border border-border ${FOCUS_RING}` : previewButton}>
      {photo && state?.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- 인증된 비공개 Blob 파일
        <img src={state.url} alt="" className="h-full w-full object-cover" />
      ) : `${label} 보기`}
    </button>
  );
}
