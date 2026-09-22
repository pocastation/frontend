"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import PhotoUploadGrid from "@/components/PhotoUploadGrid";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { itemName, slotLabel } from "@/lib/exchange-labels";
import { GRADE_LABEL, GRADE_OPTIONS, SOURCE_LABEL, SOURCE_OPTIONS } from "@/lib/labels";
import { usePhotoUpload, photoUploadErrorMessage } from "@/lib/use-photo-upload";
import { FOCUS_RING, FORM_ACTION_BAR, FORM_ACTION_BAR_PAD, FORM_ACTION_BAR_STYLE, PRESS_PRIMARY } from "@/lib/ui";
import type {
  ArtistListResponse,
  ArtistMemberResponse,
  ExchangePostDetail,
  PhotocardGrade,
  PhotocardSource,
} from "@/lib/types";

/**
 * 교환 신청(#666).
 *
 * <p>작성 위저드와 달리 한 장이다. 받는 값이 넷뿐이라(제시 포카·시간대·사진·한마디) 나누면
 * 단계가 내용보다 무거워진다.
 *
 * <p>사진은 필수다 — API가 <code>@NotEmpty</code>로 받고, 글쓴이가 상태를 보고 고르는 근거다.
 *
 * <p>앱바 부제에 <b>상대가 찾는 포카</b>를 적는다. 신청 화면만 보고 있으면 내가 무엇에 응하는
 * 중인지 잊는다.
 */

const MAX_PHOTOS = 3;

const LABEL = "mb-1.5 text-[12.5px] font-extrabold text-text-2";
const INPUT =
  "h-12 w-full rounded-r1 border border-border-2 bg-white px-3 text-[15px] font-semibold text-text-1";

export default function ExchangeApplyPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const router = useRouter();
  const { member, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [post, setPost] = useState<ExchangePostDetail | null>(null);
  const [artists, setArtists] = useState<{ id: number; name: string }[]>([]);
  const [idols, setIdols] = useState<ArtistMemberResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [artistId, setArtistId] = useState("");
  const [idolId, setIdolId] = useState("");
  const [source, setSource] = useState<PhotocardSource>("BROADCAST");
  const [grade, setGrade] = useState<PhotocardGrade>("A");
  const [slotId, setSlotId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const photos = usePhotoUpload(MAX_PHOTOS, (m) => setError(m));

  useEffect(() => {
    if (authLoading) return;
    if (!member) {
      router.replace(`/login?redirect=${encodeURIComponent(`/exchanges/${postId}/apply`)}`);
    }
  }, [authLoading, member, postId, router]);

  useEffect(() => {
    apiFetch<ExchangePostDetail>(`/api/exchanges/${postId}`, { cache: "no-store" })
      .then((detail) => {
        setPost(detail);
        // 시간대가 하나뿐이면 고를 것이 없다 — 미리 골라 두고 손을 덜어 준다.
        setSlotId(detail.slots.length === 1 ? detail.slots[0].id : null);
      })
      .catch(() => setPost(null));
  }, [postId]);

  useEffect(() => {
    apiFetch<ArtistListResponse>("/api/artists?size=100")
      .then((res) => setArtists(res.content.map((a) => ({ id: a.id, name: a.name }))))
      .catch(() => setArtists([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 스타를 바꾸면 이전 멤버 선택을 즉시 버린다.
    setIdolId("");
    if (!artistId) {
      setIdols([]);
      return;
    }
    apiFetch<{ content: ArtistMemberResponse[] }>(`/api/artists/${artistId}/idols`)
      .then((res) => setIdols(res.content))
      .catch(() => setIdols([]));
  }, [artistId]);

  const addFiles = useCallback((files: File[]) => {
    setError(null);
    photos.addFiles(files);
  }, [photos]);

  // 사진은 API가 한 장 이상을 요구한다(`CreateExchangeRequestRequest.photos`에 `@NotEmpty`).
  // 여기서 막지 않으면 다 쓰고 제출한 뒤에 「photos: 비어 있을 수 없습니다」를 보게 된다.
  const ready =
    artistId !== "" && slotId !== null && photos.uploadedUrls.length > 0 && !photos.uploading;

  async function submit() {
    if (!ready || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchWithAuth<{ id: number }>(`/api/exchanges/${postId}/requests`, {
        method: "POST",
        body: {
          slotId,
          message: message.trim() || null,
          artistId: Number(artistId),
          idolId: idolId ? Number(idolId) : null,
          source,
          grade,
          photos: photos.uploadedUrls,
        },
      });
      router.replace(`/exchanges/${postId}`);
    } catch (err) {
      setError(photoUploadErrorMessage(err));
      setSubmitting(false);
    }
  }

  const wanted = post?.wants.map(itemName).join(" · ");

  return (
    <>
      <MobilePageHead
        title="교환 신청"
        sub={wanted ? `${wanted}을(를) 찾아요` : post?.authorNickname ?? undefined}
        variant="close"
        backHref={`/exchanges/${postId}`}
      />

      <div className={`mx-auto max-w-[640px] ${FORM_ACTION_BAR_PAD} sm:px-4 sm:py-8`}>
        {error && (
          <p role="alert" className="mx-[14px] mt-3 rounded-r1 border-l-2 border-danger bg-danger-soft px-3 py-2 text-[12.5px] font-semibold text-danger sm:mx-0">
            {error}
          </p>
        )}

        <section className="px-[14px] pt-4 sm:px-0">
          <p className={LABEL}>
            내가 줄 포카<span className="ml-0.5 text-primary">*</span>
          </p>
          <select value={artistId} onChange={(e) => setArtistId(e.target.value)} className={INPUT} aria-label="스타">
            <option value="">스타를 선택하세요</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            value={idolId}
            onChange={(e) => setIdolId(e.target.value)}
            disabled={idols.length === 0}
            aria-label="멤버"
            className={`${INPUT} mt-2 disabled:bg-surface-3 disabled:text-text-3`}
          >
            <option value="">멤버 선택 (선택)</option>
            {idols.map((i) => (
              <option key={i.idolId} value={i.idolId}>{i.stageName}</option>
            ))}
          </select>

          <div className="mt-2 flex gap-2">
            <select value={source} onChange={(e) => setSource(e.target.value as PhotocardSource)} aria-label="출처" className={INPUT}>
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
              ))}
            </select>
            <select value={grade} onChange={(e) => setGrade(e.target.value as PhotocardGrade)} aria-label="상태 등급" className={INPUT}>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{GRADE_LABEL[g]}</option>
              ))}
            </select>
          </div>
        </section>

        {/* 회색 띠를 걷었다(#718). 세 묶음(포카·시간·사진)이 같은 지면 위에 서고 헤어라인으로 갈린다. */}
        <section className="mt-5 px-[14px] sm:px-0">
          <div className="border-t border-border pt-4">
          <p className={LABEL}>
            만날 시간<span className="ml-0.5 text-primary">*</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {post?.slots.map((slot) => (
              <label
                key={slot.id}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-r1 border px-3 text-[14px] font-bold transition-colors ${
                  slotId === slot.id ? "border-primary bg-primary-soft text-primary" : "border-border bg-white text-text-2"
                }`}
              >
                <input
                  type="radio"
                  name="slot"
                  checked={slotId === slot.id}
                  onChange={() => setSlotId(slot.id)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {slotLabel(slot)}
              </label>
            ))}
          </div>
          </div>
        </section>

        <section className="mt-5 px-[14px] sm:px-0">
          <div className="border-t border-border pt-4">
          {/* 누가 보는지는 화면만 봐서는 알 수 없다 — 안내 문구 중 이 한 줄만 남긴다(#718). */}
          <p className={LABEL}>
            포카 사진<span className="ml-0.5 text-primary">*</span>
            <span className="ml-1.5 font-semibold text-text-3">글쓴이에게만 보여요</span>
          </p>
          <PhotoUploadGrid
            items={photos.items}
            max={MAX_PHOTOS}
            onAddFiles={addFiles}
            onRemove={photos.removeItem}
            onReorder={photos.setItems}
          />
          </div>
        </section>

        <section className="mt-5 px-[14px] sm:px-0">
          <div className="border-t border-border pt-4">
          <p className={LABEL}>한마디 <span className="font-semibold text-text-3">(선택)</span></p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="예) 윈터 두 장 있어요. 종료 후에 뵐게요."
            className={`w-full resize-none rounded-r1 border border-border-2 bg-white px-3 py-2.5 text-[15px] outline-none placeholder:text-text-3 focus:border-primary ${FOCUS_RING}`}
          />
          </div>
        </section>

        <div className={FORM_ACTION_BAR} style={FORM_ACTION_BAR_STYLE}>
          <button
            type="button"
            disabled={!ready || submitting}
            onClick={submit}
            className={`h-12 w-full rounded-[7px] bg-primary text-[15px] font-extrabold text-white disabled:opacity-40 ${PRESS_PRIMARY} ${FOCUS_RING}`}
          >
            {submitting ? "보내는 중..." : "신청 보내기"}
          </button>
        </div>
      </div>
    </>
  );
}
