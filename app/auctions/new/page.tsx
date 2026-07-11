"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ArtistCombobox from "@/components/ArtistCombobox";
import { apiFetch, ApiError, mediaUrl, uploadMediaImage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DURATION_OPTIONS, GRADE_LABEL, GRADE_OPTIONS, SOURCE_LABEL, SOURCE_OPTIONS } from "@/lib/labels";
import { FOCUS_RING, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/ui";
import type {
  ArtistListResponse,
  ArtistMemberResponse,
  AuctionSaleType,
  PhotocardGrade,
  PhotocardSource,
} from "@/lib/types";

const MAX_IMAGES = 12;

type UploadedImage = { url: string; thumbnailUrl: string };

function SectionHeading({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 text-sm font-extrabold text-text-1">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
        {step}
      </span>
      {children}
    </h2>
  );
}

export default function NewAuctionPage() {
  const router = useRouter();
  const { accessToken, isLoading: isAuthLoading, fetchWithAuth } = useAuth();

  const artistFieldId = useId();
  const idolFieldId = useId();
  const titleFieldId = useId();
  const descriptionFieldId = useId();
  const sourceFieldId = useId();
  const gradeFieldId = useId();
  const sourceDetailFieldId = useId();
  const albumNameFieldId = useId();
  const unopenedFieldId = useId();
  const conditionNoteFieldId = useId();
  const startPriceFieldId = useId();

  const [saleType, setSaleType] = useState<AuctionSaleType>("AUCTION");
  const [artists, setArtists] = useState<{ id: number; name: string }[]>([]);
  const [artistId, setArtistId] = useState<number | "">("");
  const [idols, setIdols] = useState<ArtistMemberResponse[]>([]);
  const [idolId, setIdolId] = useState<number | "">("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<PhotocardSource>("ALBUM");
  const [sourceDetail, setSourceDetail] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [grade, setGrade] = useState<PhotocardGrade>("S");
  const [unopened, setUnopened] = useState(false);
  const [conditionNote, setConditionNote] = useState("");
  const [startPrice, setStartPrice] = useState("");
  const [durationDays, setDurationDays] = useState<number>(3);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 비로그인 상태로 접근하면 로그인으로 돌려보낸다(닉네임 온보딩 페이지와 동일 패턴).
  useEffect(() => {
    if (!isAuthLoading && !accessToken) {
      router.replace("/login");
    }
  }, [isAuthLoading, accessToken, router]);

  useEffect(() => {
    apiFetch<ArtistListResponse>("/api/artists?size=100")
      .then((res) => setArtists(res.content.map((a) => ({ id: a.id, name: a.name }))))
      .catch(() => setArtists([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 아티스트 변경 시 이전 멤버 선택값 즉시 리셋
    setIdolId("");
    if (artistId === "") {
      setIdols([]);
      return;
    }
    apiFetch<{ content: ArtistMemberResponse[] }>(`/api/artists/${artistId}/idols`)
      .then((res) => setIdols(res.content))
      .catch(() => setIdols([]));
  }, [artistId]);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !accessToken) return;
    const files = Array.from(fileList).slice(0, MAX_IMAGES - images.length);
    setError(null);
    setIsUploading(true);
    try {
      for (const file of files) {
        const uploaded = await uploadMediaImage(file, accessToken);
        setImages((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (artistId === "") {
      setError("아티스트를 선택해주세요.");
      return;
    }
    if (images.length === 0) {
      setError("사진을 1장 이상 등록해주세요.");
      return;
    }
    const price = Number(startPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError(saleType === "INSTANT" ? "즉시판매가를 입력해주세요." : "시작가를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await fetchWithAuth<{ id: number }>("/api/auctions", {
        method: "POST",
        body: {
          artistId,
          idolId: idolId === "" ? null : idolId,
          title,
          description: description || undefined,
          source,
          sourceDetail: sourceDetail || undefined,
          albumName: albumName || undefined,
          grade,
          unopened,
          conditionNote: conditionNote || undefined,
          saleType,
          startPrice: price,
          buyNowPrice: saleType === "INSTANT" ? price : undefined,
          durationDays: saleType === "AUCTION" ? durationDays : undefined,
          images,
        },
      });
      router.push(`/auctions/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "판매 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading || !accessToken) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3" aria-live="polite">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-extrabold text-text-1">판매 등록</h1>
          <p className="mt-1 text-xs text-text-3">정확한 정보와 실물 사진일수록 거래 신뢰도가 올라가요.</p>
        </div>
        <Link
          href="/guide"
          className={`flex shrink-0 items-center gap-1 rounded-full border border-border-2 px-3 py-1.5 text-xs font-bold text-text-2 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
        >
          <span aria-hidden="true">?</span> 판매 가이드
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-8 rounded-r4 border border-border bg-surface p-5 shadow-card sm:p-7"
      >
        <section>
          <SectionHeading step={1}>판매 방식</SectionHeading>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { type: "AUCTION" as const, title: "경매판매", desc: "정한 기간 동안 입찰을 받아 판매해요." },
              { type: "INSTANT" as const, title: "즉시판매", desc: "정한 가격으로 바로 구매할 수 있게 올려요." },
            ].map((option) => {
              const selected = saleType === option.type;
              return (
                <button
                  key={option.type}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSaleType(option.type)}
                  className={`rounded-r3 border p-4 text-left transition-colors ${FOCUS_RING} ${
                    selected
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-white text-text-2 hover:border-primary"
                  }`}
                >
                  <span className="block text-sm font-extrabold">{option.title}</span>
                  <span className={`mt-1 block text-xs ${selected ? "text-primary" : "text-text-3"}`}>
                    {option.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <SectionHeading step={2}>카테고리 · 소개</SectionHeading>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={artistFieldId} className="text-xs font-bold text-text-2">
                아티스트 <span className="text-accent">*</span>
              </label>
              <ArtistCombobox id={artistFieldId} options={artists} value={artistId} onChange={setArtistId} />
            </div>

            {idols.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={idolFieldId} className="text-xs font-bold text-text-2">
                  멤버 (선택)
                </label>
                <select
                  id={idolFieldId}
                  value={idolId}
                  onChange={(e) => setIdolId(e.target.value ? Number(e.target.value) : "")}
                  className={INPUT_CLASS}
                >
                  <option value="">단체 포카 / 미지정</option>
                  {idols.map((idol) => (
                    <option key={idol.idolId} value={idol.idolId}>
                      {idol.stageName}
                      {!idol.active ? " (탈퇴)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor={titleFieldId} className="text-xs font-bold text-text-2">
                제목 <span className="text-accent">*</span>
              </label>
              <input
                id={titleFieldId}
                type="text"
                required
                maxLength={200}
                placeholder="예: 정국 Proof 위버스 특전 포카"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={descriptionFieldId} className="text-xs font-bold text-text-2">
                상세 설명 (선택)
              </label>
              <textarea
                id={descriptionFieldId}
                maxLength={2000}
                rows={3}
                placeholder="구매 경로, 보관 방식 등 참고할 내용을 적어주세요."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <SectionHeading step={3}>상품 정보</SectionHeading>
          <div className="flex flex-col gap-3">
            {/* 모바일은 1열(긴 등급 옵션이 잘리지 않게), sm 이상은 2열. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={sourceFieldId} className="text-xs font-bold text-text-2">
                  출처
                </label>
                <select
                  id={sourceFieldId}
                  value={source}
                  onChange={(e) => setSource(e.target.value as PhotocardSource)}
                  className={INPUT_CLASS}
                >
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {SOURCE_LABEL[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={gradeFieldId} className="text-xs font-bold text-text-2">
                  상태 등급
                </label>
                <select
                  id={gradeFieldId}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as PhotocardGrade)}
                  className={INPUT_CLASS}
                >
                  {GRADE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {GRADE_LABEL[option]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={sourceDetailFieldId} className="text-xs font-bold text-text-2">
                출처 상세 (선택)
              </label>
              <input
                id={sourceDetailFieldId}
                type="text"
                maxLength={100}
                placeholder="예: 알라딘 예약특전, 3차 팬사인회 등"
                value={sourceDetail}
                onChange={(e) => setSourceDetail(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={albumNameFieldId} className="text-xs font-bold text-text-2">
                앨범명 (선택)
              </label>
              <input
                id={albumNameFieldId}
                type="text"
                maxLength={100}
                placeholder="예: Proof"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <label htmlFor={unopenedFieldId} className="flex w-fit items-center gap-2 text-sm text-text-2">
              <input
                id={unopenedFieldId}
                type="checkbox"
                checked={unopened}
                onChange={(e) => setUnopened(e.target.checked)}
                className={`h-4 w-4 accent-primary ${FOCUS_RING}`}
              />
              미개봉 상품입니다
            </label>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={conditionNoteFieldId} className="text-xs font-bold text-text-2">
                하자/상태 상세 고지 (선택)
              </label>
              <textarea
                id={conditionNoteFieldId}
                maxLength={2000}
                rows={2}
                placeholder="스크래치, 눌림, 화이트 등 있는 그대로 적어주세요."
                value={conditionNote}
                onChange={(e) => setConditionNote(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <SectionHeading step={4}>{saleType === "INSTANT" ? "가격" : "가격 · 경매 기간"}</SectionHeading>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={startPriceFieldId} className="text-xs font-bold text-text-2">
                {saleType === "INSTANT" ? "즉시판매가(원)" : "시작가(원)"} <span className="text-accent">*</span>
              </label>
              <input
                id={startPriceFieldId}
                type="number"
                required
                min={0}
                step={1000}
                inputMode="numeric"
                placeholder="10000"
                value={startPrice}
                onChange={(e) => setStartPrice(e.target.value)}
                className={INPUT_CLASS}
              />
              <p className="text-[11px] text-text-3">
                {saleType === "INSTANT"
                  ? "배송비는 판매자 부담이에요. 배송비를 감안해 판매가를 정해주세요."
                  : "배송비는 판매자 부담이에요. 배송비를 감안해 시작가를 정해주세요."}
              </p>
            </div>

            {saleType === "AUCTION" && (
            <fieldset>
              <legend className="mb-1.5 text-xs font-bold text-text-2">경매 기간</legend>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={durationDays === days}
                    onClick={() => setDurationDays(days)}
                    className={`flex-1 rounded-r2 border py-2.5 text-sm font-bold transition-all active:scale-[0.97] ${FOCUS_RING} ${
                      durationDays === days
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-text-2 hover:border-border-2"
                    }`}
                  >
                    {days}일
                  </button>
                ))}
              </div>
            </fieldset>
            )}
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <SectionHeading step={5}>사진</SectionHeading>
          <p className="mb-2 text-xs text-text-3">1~{MAX_IMAGES}장, 첫 장이 대표사진으로 노출돼요.</p>

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {images.map((image, index) => (
              <div key={image.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
                <img
                  src={mediaUrl(image.thumbnailUrl)}
                  alt={`업로드 사진 ${index + 1}`}
                  className="aspect-square rounded-r2 border border-border object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">
                    대표
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`${index + 1}번째 사진 삭제`}
                  onClick={() => removeImage(index)}
                  className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white transition-transform hover:scale-110 active:scale-95 ${FOCUS_RING}`}
                >
                  ×
                </button>
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <label
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-r2 border-2 border-dashed border-border-2 text-text-3 transition-colors hover:border-primary hover:text-primary ${
                  isUploading ? "pointer-events-none opacity-60" : ""
                } ${FOCUS_RING}`}
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  {isUploading ? "…" : "+"}
                </span>
                <span className="text-[10px] font-semibold">
                  {isUploading ? "업로드 중" : "사진 추가"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={isUploading}
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            )}
          </div>
        </section>

        {error && (
          <p role="alert" aria-live="polite" className="-mt-4 text-xs text-accent">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className={`py-3 ${PRIMARY_BUTTON_CLASS}`}
        >
          {isSubmitting ? "등록 중..." : saleType === "INSTANT" ? "즉시판매 등록" : "경매 등록"}
        </button>
      </form>
    </div>
  );
}
