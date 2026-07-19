"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ArtistCombobox from "@/components/ArtistCombobox";
import AuctionVerificationStep from "@/components/AuctionVerificationStep";
import PhotoUploadGrid, { type PhotoItem } from "@/components/PhotoUploadGrid";
import VideoUploadField, { type VideoItem } from "@/components/VideoUploadField";
import { apiFetch, ApiError, getVideoStatus, uploadMediaImage, uploadMediaVideo } from "@/lib/api";
import { compressImage } from "@/lib/image-compress";
import { validateVideo } from "@/lib/video-validate";
import { useAuth } from "@/lib/auth-context";
import { DURATION_OPTIONS, GRADE_LABEL, GRADE_OPTIONS, SOURCE_LABEL, SOURCE_OPTIONS } from "@/lib/labels";
import { FOCUS_RING, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type {
  ArtistListResponse,
  ArtistMemberResponse,
  AuctionSaleType,
  PhotocardGrade,
  PhotocardSource,
} from "@/lib/types";

const MAX_IMAGES = 12;
const AUCTION_VERIFICATION_ENABLED =
  process.env.NEXT_PUBLIC_AUCTION_VERIFICATION_ENABLED === "true" ||
  (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_AUCTION_VERIFICATION_ENABLED !== "false");
const AUCTION_VIDEO_ENABLED =
  process.env.NEXT_PUBLIC_AUCTION_VIDEO_ENABLED === "true" ||
  (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_AUCTION_VIDEO_ENABLED !== "false");

// 위저드 스텝 순서 — 사진 다음에 영상, 그다음 (옵션) 사진 인증. 플래그로 스텝이 빠질 수 있어
// 인덱스 하드코딩(step === 4) 대신 키 배열로 관리한다(중간 스텝 삽입 시 인덱스가 밀리는 버그 방지).
type StepKey = "saleType" | "info" | "product" | "price" | "photos" | "video" | "verification";
const STEP_KEYS: StepKey[] = [
  "saleType",
  "info",
  "product",
  "price",
  "photos",
  ...(AUCTION_VIDEO_ENABLED ? (["video"] as StepKey[]) : []),
  ...(AUCTION_VERIFICATION_ENABLED ? (["verification"] as StepKey[]) : []),
];
const TOTAL_STEPS = STEP_KEYS.length;

export default function NewAuctionPage() {
  const router = useRouter();
  const { accessToken, isLoading: isAuthLoading, fetchWithAuth } = useAuth();

  const artistFieldId = useId();
  const idolFieldId = useId();
  const titleFieldId = useId();
  const descriptionFieldId = useId();
  const sourceFieldId = useId();
  const gradeFieldId = useId();
  const unopenedFieldId = useId();
  const startPriceFieldId = useId();

  const [saleType, setSaleType] = useState<AuctionSaleType>("AUCTION");
  const [artists, setArtists] = useState<{ id: number; name: string }[]>([]);
  const [artistId, setArtistId] = useState<number | "">("");
  const [idols, setIdols] = useState<ArtistMemberResponse[]>([]);
  const [idolId, setIdolId] = useState<number | "">("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<PhotocardSource>("ALBUM");
  const [grade, setGrade] = useState<PhotocardGrade>("S");
  const [unopened, setUnopened] = useState(false);
  const [startPrice, setStartPrice] = useState("");
  const [durationDays, setDurationDays] = useState<number>(3);

  const [items, setItems] = useState<PhotoItem[]>([]);
  const [video, setVideo] = useState<(VideoItem & { videoId?: string }) | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  // 완료된 사진만 순서대로 제출한다(실패 격리 — 실패 타일은 화면엔 남되 제출에선 제외).
  const uploadedImages = items.filter((i) => i.status === "done" && i.uploaded).map((i) => i.uploaded!);
  const isUploading = items.some((i) => i.status === "uploading");

  // 언마운트 시 로컬 object URL 정리(누수 방지). 최신 items/video를 ref로 참조.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []);

  const videoRef = useRef(video);
  useEffect(() => {
    videoRef.current = video;
  }, [video]);
  useEffect(() => () => {
    if (videoRef.current) URL.revokeObjectURL(videoRef.current.previewUrl);
  }, []);

  // 트랜스코딩 지연 폴링 — 업로드 후 PROCESSING 동안 상태를 주기적으로 확인해 READY/FAILED로 전이.
  // status/videoId/token 변화에만 재구독하도록 필요한 값만 의존성에 둔다(전체 video 객체 참조 회피).
  const videoStatus = video?.status;
  const videoId = video?.videoId;
  useEffect(() => {
    if (videoStatus !== "processing" || !videoId || !accessToken) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const s = await getVideoStatus(videoId, accessToken);
        if (cancelled) return;
        if (s.status === "READY") {
          setVideo((v) => (v ? { ...v, status: "ready" } : v));
        } else if (s.status === "FAILED") {
          setVideo((v) => (v ? { ...v, status: "error", error: "영상 처리에 실패했어요. 다시 시도해주세요." } : v));
        }
      } catch {
        // 일시 오류는 다음 틱에 재시도
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [videoStatus, videoId, accessToken]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 위저드: 한 스텝씩 입력하며 넘어간다. dir는 슬라이드 방향(1=다음, -1=이전).
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

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

  // 여러 장을 병렬로 업로드한다 — 각 파일이 독립적으로 진행/실패하므로 한 장이 실패해도 나머지는 계속된다.
  function addFiles(files: File[]) {
    if (!accessToken) return;
    const picked = files.slice(0, MAX_IMAGES - items.length);
    if (picked.length === 0) return;
    setError(null);
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
          const uploaded = await uploadMediaImage(compressed, accessToken);
          setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "done", uploaded } : x)));
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "업로드 실패";
          setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "error", error: message } : x)));
        }
      })();
    });
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const found = prev.find((x) => x.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  // 영상은 1개만 — 새로 고르면 클라 검증 후 업로드하고, PROCESSING이 되면 위 폴링 effect가 완료를 감지한다.
  async function addVideo(file: File) {
    if (!accessToken) return;
    setError(null);
    const result = await validateVideo(file);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setVideo({ previewUrl, status: "uploading" });
    try {
      const uploaded = await uploadMediaVideo(file, accessToken);
      setVideo((v) => (v ? { ...v, status: "processing", videoId: uploaded.videoId } : v));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "영상 업로드에 실패했어요.";
      setVideo((v) => (v ? { ...v, status: "error", error: message } : v));
    }
  }

  function removeVideo() {
    setVideo((v) => {
      if (v) URL.revokeObjectURL(v.previewUrl);
      return null;
    });
  }

  // 각 스텝의 필수값이 채워졌는지 — 안 채워지면 "다음"/"등록" 비활성.
  const priceValid = startPrice.trim() !== "" && Number.isFinite(Number(startPrice)) && Number(startPrice) >= 0;
  function isStepValid(s: number): boolean {
    switch (STEP_KEYS[s]) {
      case "info":
        return artistId !== "" && title.trim().length > 0;
      case "price":
        return priceValid;
      case "photos":
        return uploadedImages.length > 0 && !isUploading;
      case "video":
        return video?.status === "ready"; // 처리 완료된 영상만 통과(필수)
      case "verification":
        return verificationId !== null;
      default:
        return true; // 판매 방식 · 상품 정보는 기본값이 있어 항상 통과
    }
  }

  function goNext() {
    if (step < TOTAL_STEPS - 1 && isStepValid(step)) {
      setDir(1);
      setStep((s) => s + 1);
      setError(null);
    }
  }

  function goBack() {
    if (step > 0) {
      setDir(-1);
      setStep((s) => s - 1);
      setError(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // 마지막 스텝이 아니면 제출하지 않는다(입력 중 Enter로 조기 제출 방지).
    if (step !== TOTAL_STEPS - 1) return;
    setError(null);

    if (artistId === "") {
      setError("아티스트를 선택해주세요.");
      return;
    }
    if (uploadedImages.length === 0) {
      setError("사진을 1장 이상 등록해주세요.");
      return;
    }
    if (AUCTION_VIDEO_ENABLED && video?.status !== "ready") {
      setError("검수영상 처리가 완료된 뒤 등록할 수 있어요.");
      return;
    }
    if (AUCTION_VERIFICATION_ENABLED && !verificationId) {
      setError("판매 물품 소유 인증을 완료해주세요.");
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
          grade,
          unopened,
          saleType,
          startPrice: price,
          buyNowPrice: saleType === "INSTANT" ? price : undefined,
          durationDays: saleType === "AUCTION" ? durationDays : undefined,
          images: uploadedImages,
          videoId: AUCTION_VIDEO_ENABLED ? (video?.videoId ?? undefined) : undefined,
          verificationId: AUCTION_VERIFICATION_ENABLED ? (verificationId ?? undefined) : undefined,
        },
      });
      router.push(AUCTION_VERIFICATION_ENABLED ? "/mypage?tab=sellHistory" : `/auctions/${created.id}`);
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

  const stepKey = STEP_KEYS[step];
  const stepTitle: Record<StepKey, string> = {
    saleType: "판매 방식",
    info: "카테고리 · 소개",
    product: "상품 정보",
    price: saleType === "INSTANT" ? "가격" : "가격 · 경매 기간",
    photos: "사진",
    video: "영상",
    verification: "사진 인증",
  };
  const isLastStep = step === TOTAL_STEPS - 1;

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
          판매 가이드
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-r4 border border-border bg-surface p-5 shadow-card sm:p-7"
      >
        {/* 진행 표시 */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-extrabold text-text-1">{stepTitle[stepKey]}</h2>
            <span className="text-xs font-bold text-text-3">
              {step + 1} / {TOTAL_STEPS}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* 스텝 콘텐츠 — key로 스텝이 바뀔 때마다 슬라이드 인 애니메이션이 재생된다. */}
        <div
          key={step}
          className={`min-h-[260px] ${
            dir === 1
              ? "animate-[wizardInRight_240ms_ease-out]"
              : "animate-[wizardInLeft_240ms_ease-out]"
          }`}
        >
          {stepKey === "saleType" && (
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
          )}

          {stepKey === "info" && (
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
                  placeholder="구매 경로·앨범·보관 방식과 함께, 하자·상태(스크래치·눌림·화이트 등)를 있는 그대로 적어주세요."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          {stepKey === "product" && (
            <div className="flex flex-col gap-3">
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
            </div>
          )}

          {stepKey === "price" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={startPriceFieldId} className="text-xs font-bold text-text-2">
                  {saleType === "INSTANT" ? "즉시판매가(원)" : "시작가(원)"} <span className="text-accent">*</span>
                </label>
                <input
                  id={startPriceFieldId}
                  type="number"
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
          )}

          {stepKey === "photos" && (
            <div>
              <p className="mb-2 text-xs text-text-3">1~{MAX_IMAGES}장, 첫 장이 대표사진으로 노출돼요.</p>
              <PhotoUploadGrid
                items={items}
                max={MAX_IMAGES}
                onAddFiles={addFiles}
                onRemove={removeItem}
                onReorder={setItems}
              />
            </div>
          )}
          {stepKey === "video" && (
            <div>
              <p className="mb-2 text-xs text-text-3">
                개봉·틸팅 등 실물을 확인할 수 있는 검수영상 1개를 올려주세요. 정품 신뢰도가 올라가요.
              </p>
              <VideoUploadField video={video} onSelect={addVideo} onRemove={removeVideo} />
            </div>
          )}
          {stepKey === "verification" && (
            <AuctionVerificationStep
              verificationId={verificationId}
              onVerified={setVerificationId}
            />
          )}
        </div>

        {error && (
          <p role="alert" aria-live="polite" className="mt-4 text-xs text-accent">
            {error}
          </p>
        )}

        {/* 이동/등록 */}
        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <button type="button" onClick={goBack} className={`h-12 px-6 ${SECONDARY_BUTTON_CLASS}`}>
              이전
            </button>
          )}
          {isLastStep ? (
            <button
              type="submit"
              disabled={!isStepValid(step) || isSubmitting || isUploading}
              className={`h-12 flex-1 ${PRIMARY_BUTTON_CLASS}`}
            >
              {isSubmitting ? "등록 중..." : saleType === "INSTANT" ? "즉시판매 등록" : "경매 등록"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!isStepValid(step)}
              className={`h-12 flex-1 ${PRIMARY_BUTTON_CLASS}`}
            >
              다음
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
