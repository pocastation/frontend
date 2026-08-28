"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { envFlag } from "@/lib/env";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ArtistCombobox from "@/components/ArtistCombobox";
import AuctionVerificationStep from "@/components/AuctionVerificationStep";
import PhotoUploadGrid, { type PhotoItem } from "@/components/PhotoUploadGrid";
import VideoUploadField, { type VideoItem } from "@/components/VideoUploadField";
import { apiFetch, ApiError } from "@/lib/api";
import { compressImage } from "@/lib/image-compress";
import {
  MAX_VIDEO_DURATION_SEC,
  MIN_VIDEO_DURATION_SEC,
  validateVideo,
} from "@/lib/video-validate";
import { useAuth } from "@/lib/auth-context";
import { DURATION_OPTIONS, GRADE_LABEL, GRADE_OPTIONS, SOURCE_LABEL, SOURCE_OPTIONS } from "@/lib/labels";
import { FOCUS_RING, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type {
  ArtistListResponse,
  ArtistMemberResponse,
  AuctionSaleType,
  AuctionStatus,
  MediaUploadResponse,
  PhotocardGrade,
  PhotocardSource,
  VideoFailureReason,
  VideoStatusResponse,
  VideoUploadResponse,
} from "@/lib/types";

// 사진 장수(#279) — 3장 미만이면 구매자가 상태를 판단할 근거가 없고(라이브에 1장짜리 매물이
// 실제로 올라왔다), 상한을 6장으로 낮춘 건 "다 올릴 수 있다"보다 "무엇을 올려야 하는지"를
// 말해주는 편이 사진의 질을 올리기 때문이다. 서버도 같은 값으로 막는다(backend #266).
const MIN_IMAGES = 3;
const MAX_IMAGES = 6;
const AUCTION_VERIFICATION_ENABLED =
  envFlag(process.env.NEXT_PUBLIC_AUCTION_VERIFICATION_ENABLED, false) ||
  (process.env.NODE_ENV === "development"
    && envFlag(process.env.NEXT_PUBLIC_AUCTION_VERIFICATION_ENABLED, true));
// 검수영상은 기본 활성화하고, 긴급 롤백이 필요할 때만 환경변수로 명시적으로 끈다.
const AUCTION_VIDEO_ENABLED = envFlag(process.env.NEXT_PUBLIC_AUCTION_VIDEO_ENABLED, true);

// 위저드 스텝 순서 — 사진·영상을 한 단계(media)에서 받고, 그다음 (옵션) 사진 인증.
// 플래그로 스텝이 빠질 수 있어 인덱스 하드코딩(step === 4) 대신 키 배열로 관리한다
// (중간 스텝 삽입 시 인덱스가 밀리는 버그 방지).
//
// 사진과 영상을 합친 이유(#279): 둘 다 "파일을 올리고 처리가 끝나기를 기다린다"는 같은 동작이라
// 단계를 나눠도 사용자가 하는 일이 달라지지 않는다. 오히려 영상 트랜스코딩을 기다리는 동안
// 앞뒤로 오갈 수 없어 폼이 멈춘 것처럼 보였다. 폼이 짧을수록 액세스 토큰 만료(#269)도 덜 겪는다.
type StepKey = "saleType" | "info" | "product" | "price" | "media" | "verification";
const STEP_KEYS: StepKey[] = [
  "saleType",
  "info",
  "product",
  "price",
  "media",
  ...(AUCTION_VERIFICATION_ENABLED ? (["verification"] as StepKey[]) : []),
];
const TOTAL_STEPS = STEP_KEYS.length;

// 업로드 실패 사유를 사람이 읽을 문장으로 바꾼다(#269).
// 401은 리프레시까지 실패했다는 뜻이라 "다시 시도"로 안내하면 사용자가 같은 실패를 반복한다 —
// 재로그인이 필요하다는 것을 분명히 말해야 한다.
// 영상이 서버에서 FAILED가 된 이유를 문장으로 바꾼다(backend #266).
// 길이 위반은 **같은 파일을 다시 올려도 영원히 실패한다** — "다시 시도해주세요"로 안내하면
// 판매자가 그 자리에서 무한히 막힌다. 사유를 모르는 경우(전환 이전 행)는 기존 문구를 유지한다.
function videoFailureMessage(reason: VideoFailureReason | null): string {
  if (reason === "DURATION_OUT_OF_RANGE") {
    return `영상 길이가 ${MIN_VIDEO_DURATION_SEC}~${MAX_VIDEO_DURATION_SEC}초를 벗어났어요. 길이를 맞춰 다시 올려주세요.`;
  }
  return "영상 처리에 실패했어요. 다시 시도해주세요.";
}

function uploadErrorMessage(err: unknown, what: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return `로그인이 만료돼 ${what}을 올리지 못했어요. 다시 로그인한 뒤 이어서 등록해 주세요.`;
    }
    return err.message;
  }
  return `${what} 업로드에 실패했어요. 잠시 후 다시 시도해 주세요.`;
}

export default function NewAuctionPage() {
  const router = useRouter();
  const { accessToken, isLoading: isAuthLoading, fetchWithAuth, fetchMultipartWithAuth } = useAuth();

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
        // 폴링도 갱신되는 경로로 간다 — catch가 오류를 삼키므로 토큰이 만료되면
        // "처리 중"에서 영원히 멈춘 것처럼 보인다(#269).
        const s = await fetchWithAuth<VideoStatusResponse>(`/api/media/videos/${videoId}`);
        if (cancelled) return;
        if (s.status === "READY") {
          setVideo((v) => (v ? { ...v, status: "ready" } : v));
        } else if (s.status === "FAILED") {
          setVideo((v) => (v ? { ...v, status: "error", error: videoFailureMessage(s.failureReason) } : v));
        }
      } catch {
        // 일시 오류는 다음 틱에 재시도
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [videoStatus, videoId, accessToken, fetchWithAuth]);

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

  // 정산계좌가 없으면 폼을 채우게 두지 않는다(BE #260 게이트와 짝). 서버는 마지막 제출에서
  // 409로 막는데, 그때는 사진까지 다 올린 뒤라 사용자가 한 번 더 처음부터 해야 한다.
  // 여기서 먼저 세우면 "등록하러 갔다가 계좌부터 만들고 돌아오는" 한 번의 왕복으로 끝난다.
  const [settlementReady, setSettlementReady] = useState<boolean | null>(null);
  useEffect(() => {
    if (isAuthLoading || !accessToken) return;
    let alive = true;
    fetchWithAuth<unknown>("/api/members/me/settlement-account")
      .then(() => {
        if (alive) setSettlementReady(true);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        // 404 = 미등록(정상 상태). 그 외 오류로 등록을 막으면 서버가 잠깐 흔들릴 때
        // 판매 자체가 멈춘다 — 판정은 서버의 409에 맡기고 여기선 통과시킨다.
        setSettlementReady(!(err instanceof ApiError && err.status === 404));
      });
    return () => {
      alive = false;
    };
  }, [isAuthLoading, accessToken, fetchWithAuth]);

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
          // fetchMultipartWithAuth를 쓰는 이유: 401이면 리프레시 후 재시도한다(#269).
          // 액세스 토큰은 30분인데 이 폼은 5단계라, 사진 단계에 도달할 때쯤 만료돼 있기 쉽다.
          const formData = new FormData();
          formData.append("file", compressed);
          const uploaded = await fetchMultipartWithAuth<MediaUploadResponse>("/api/media/images", formData);
          setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "done", uploaded } : x)));
        } catch (err) {
          const message = uploadErrorMessage(err, "사진");
          setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status: "error", error: message } : x)));
          // 타일은 좁아서 사유를 다 못 보여준다 — 폼 상단에 한 번 띄운다. 이게 없으면
          // 사용자도 우리도 "업로드 실패" 네 글자만 보고 원인을 추측하게 된다.
          setError(message);
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
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await fetchMultipartWithAuth<VideoUploadResponse>("/api/media/videos", formData);
      setVideo((v) => (v ? { ...v, status: "processing", videoId: uploaded.videoId } : v));
    } catch (err) {
      const message = uploadErrorMessage(err, "영상");
      setVideo((v) => (v ? { ...v, status: "error", error: message } : v));
      setError(message);
    }
  }

  function removeVideo() {
    setVideo((v) => {
      if (v) URL.revokeObjectURL(v.previewUrl);
      return null;
    });
  }

  // 각 스텝의 필수값이 채워졌는지 — 안 채워지면 "다음"/"등록" 비활성.
  // 최소 제안가·즉시판매가: 최저 5,000원 + 500원 단위.
  const priceValid =
    startPrice.trim() !== "" &&
    Number.isFinite(Number(startPrice)) &&
    Number(startPrice) >= 5000 &&
    Number(startPrice) % 500 === 0;
  function isStepValid(s: number): boolean {
    switch (STEP_KEYS[s]) {
      case "info":
        return artistId !== "" && title.trim().length > 0;
      case "price":
        return priceValid;
      // 사진·영상이 한 단계라 둘 다 충족해야 넘어간다. 영상은 처리 완료된 것만 통과(필수).
      case "media":
        return (
          uploadedImages.length >= MIN_IMAGES &&
          !isUploading &&
          (!AUCTION_VIDEO_ENABLED || video?.status === "ready")
        );
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
      setError("스타를 선택해주세요.");
      return;
    }
    if (uploadedImages.length < MIN_IMAGES) {
      setError(`사진을 ${MIN_IMAGES}장 이상 등록해주세요.`);
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
    if (!Number.isFinite(price) || price < 5000 || price % 500 !== 0) {
      const label = saleType === "INSTANT" ? "즉시판매가" : "최소 제안가";
      setError(`${label}는 최저 5,000원부터 500원 단위로 입력해주세요.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await fetchWithAuth<{ id: number; status: AuctionStatus }>("/api/auctions", {
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
      // 목적지는 빌드타임 플래그가 아니라 **서버가 알려준 실제 상태**로 정한다. 자동 승인이면
      // 바로 내 매물을 보여주고, 검수 대기면 안내 화면으로 보낸다(거기서 홈으로 자동 이동).
      router.push(
        created.status === "PENDING_REVIEW"
          ? `/auctions/submitted?id=${created.id}`
          : `/auctions/${created.id}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === "VERIFICATION_EXPIRED") {
        setVerificationId(null);
        setError("인증 코드가 만료되었습니다. 입력한 판매 정보는 유지되니 새 코드를 발급해주세요.");
      } else {
        setError(err instanceof ApiError ? err.message : "판매 등록에 실패했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading || !accessToken || settlementReady === null) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3" aria-live="polite">
        불러오는 중...
      </div>
    );
  }

  // 정산계좌 미등록 — 폼을 아예 열지 않는다. 판매 대금을 보낼 곳이 없는 상태로 거래가 성사되면
  // 대금은 묶이고 구매자는 영문도 모른 채 기다린다.
  if (!settlementReady) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-16 pb-20">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-primary">등록 전 한 가지</p>
        <h1 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.035em] text-text-1">
          정산계좌를 먼저 등록해 주세요
        </h1>
        <p className="mt-3 text-[13.5px] leading-[1.8] text-text-2">
          판매 대금은 구매확정 후 등록하신 계좌로 들어와요. 계좌 없이 거래가 성사되면 대금을 보내드릴 수 없어
          거래가 그대로 멈춥니다.
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-text-3">1분이면 끝나고, 한 번만 등록하면 돼요.</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/mypage?tab=settlement"
            className={`inline-flex h-12 items-center rounded-[4px] bg-primary px-7 text-[14.5px] font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
          >
            정산계좌 등록하러 가기
          </Link>
          <Link
            href="/"
            className={`inline-flex h-12 items-center rounded-[4px] border border-border-2 px-6 text-[14px] font-bold text-text-1 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
          >
            나중에 하기
          </Link>
        </div>
      </div>
    );
  }

  const stepKey = STEP_KEYS[step];
  const stepTitle: Record<StepKey, string> = {
    saleType: "판매 방식",
    info: "카테고리 · 소개",
    product: "상품 정보",
    price: saleType === "INSTANT" ? "가격" : "가격 · 판매 기간",
    media: AUCTION_VIDEO_ENABLED ? "사진 · 영상" : "사진",
    verification: "사진 인증",
  };
  const isLastStep = step === TOTAL_STEPS - 1;

  const progress = `${((step + 1) / TOTAL_STEPS) * 100}%`;

  return (
    // 모바일은 위저드가 화면 전체를 쓴다(전역 헤더·푸터는 접힌다). 하단 고정 바 높이만큼 아래를 비운다.
    <div className="mx-auto max-w-2xl sm:px-4 sm:py-10 max-sm:pb-[92px]">
      {/* 모바일 머리 — 스크롤해도 "어느 단계인지"가 화면에 남아 있어야 한다(킷과 같은 구성). */}
      <div className="sticky top-0 z-[260] border-b border-border bg-white px-[14px] pb-2.5 pt-3 sm:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-[17px] font-extrabold text-text-1">판매 등록</h1>
            <p className="mt-0.5 text-[11px] text-text-3">정확한 정보와 실물 사진일수록 거래 신뢰도가 올라가요.</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-0.5">
            <Link
              href="/guide/sell"
              className={`flex min-h-[30px] items-center whitespace-nowrap rounded-full border border-border-2 px-2.5 text-[11.5px] font-bold text-text-2 ${FOCUS_RING}`}
            >
              판매 가이드
            </Link>
            <Link
              href="/"
              aria-label="닫기"
              className={`flex h-[30px] w-[30px] items-center justify-center text-text-3 ${FOCUS_RING}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-[13px] font-extrabold text-text-1">{stepTitle[stepKey]}</span>
          <span className="font-display text-[11.5px] font-bold tabular-nums text-text-3">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
        <div className="mt-[7px] h-[5px] overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: progress }} />
        </div>
      </div>

      <div className="mb-5 flex items-start justify-between gap-4 max-sm:hidden">
        <div>
          <h1 className="font-display text-xl font-extrabold text-text-1">판매 등록</h1>
          <p className="mt-1 text-xs text-text-3">정확한 정보와 실물 사진일수록 거래 신뢰도가 올라가요.</p>
        </div>
        <Link
          href="/guide/sell"
          className={`flex shrink-0 items-center gap-1 rounded-full border border-border-2 px-3 py-1.5 text-xs font-bold text-text-2 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
        >
          판매 가이드
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        // 모바일 우선 — 기본이 모바일 지면(전체폭)이고 `sm:`가 데스크탑 카드를 얹는다.
        // **임의값(px-[14px])을 쓰지 않는다**: Tailwind가 임의값 유틸리티를 `sm:` 변형보다 뒤에
        // 배치해 데스크탑에서 모바일 패딩이 이겨버린다(양방향으로 실측해 확인). 표준 스케일만 쓴다.
        className="bg-surface px-3.5 pt-4.5 sm:rounded-r4 sm:border sm:border-border sm:px-7 sm:py-7 sm:shadow-card"
      >
        {/* 진행 표시 — 모바일은 sticky 머리가 대신한다. */}
        <div className="mb-6 max-sm:hidden">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-extrabold text-text-1">{stepTitle[stepKey]}</h2>
            <span className="text-xs font-bold text-text-3">
              {step + 1} / {TOTAL_STEPS}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: progress }}
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
                { type: "AUCTION" as const, title: "제안판매", desc: "정한 기간 동안 가격 제안을 받아 판매해요." },
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
                  스타 <span className="text-accent">*</span>
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
                  {saleType === "INSTANT" ? "즉시판매가(원)" : "최소 제안가(원)"} <span className="text-accent">*</span>
                </label>
                <input
                  id={startPriceFieldId}
                  type="number"
                  min={5000}
                  step={500}
                  inputMode="numeric"
                  placeholder="10000"
                  value={startPrice}
                  onChange={(e) => setStartPrice(e.target.value)}
                  className={INPUT_CLASS}
                />
                <p className="text-[11px] text-text-3">최저 5,000원부터 500원 단위로 입력해요.</p>
                <p className="text-[11px] text-text-3">
                  {saleType === "INSTANT"
                    ? "배송비는 판매자 부담이에요. 배송비를 감안해 판매가를 정해주세요."
                    : "배송비는 판매자 부담이에요. 배송비를 감안해 최소 제안가를 정해주세요."}
                </p>
              </div>

              {saleType === "AUCTION" && (
                <fieldset>
                  <legend className="mb-1.5 text-xs font-bold text-text-2">판매 기간</legend>
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

          {stepKey === "media" && (
            <div>
              <p className="mb-2 text-xs text-text-3">
                {MIN_IMAGES}~{MAX_IMAGES}장, 첫 장이 대표사진으로 노출돼요.
              </p>
              <PhotoUploadGrid
                items={items}
                max={MAX_IMAGES}
                onAddFiles={addFiles}
                onRemove={removeItem}
                onReorder={setItems}
              />
              {/* 슬리브 안내(#279) — 경고가 아니라 촬영 요령이라 규칙선 강조 없이 helper로 둔다.
                  사진·영상 양쪽에 걸리는 이야기라 두 슬롯 사이가 아니라 사진 아래에 한 번만 쓴다. */}
              <p className="mt-2 text-xs leading-5 text-text-3">
                포토카드는 <b className="font-bold text-text-2">슬리브·탑로더에서 꺼내고 촬영</b>해 주세요.
                비닐의 반사와 흠집이 카드 자체의 상태로 오해받아 문의와 분쟁이 생겨요.
              </p>

              {AUCTION_VIDEO_ENABLED && (
                <div className="mt-6 border-t border-border pt-5">
                  <p className="mb-2 text-xs text-text-3">
                    포카를 손에 들고 앞뒤로 천천히 돌리는 틸팅 영상 1개를 올려주세요. 홀로그램·코팅
                    상태처럼 사진으로는 판단하기 어려운 부분이 영상에서 드러나요.
                  </p>
                  <VideoUploadField video={video} onSelect={addVideo} onRemove={removeVideo} />
                </div>
              )}
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
        <div className="mt-6 flex gap-2 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-[400] max-sm:mt-0 max-sm:border-t max-sm:border-border max-sm:bg-white max-sm:px-[14px] max-sm:pt-2.5 max-sm:pb-[calc(10px_+_env(safe-area-inset-bottom))]">
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
              {isSubmitting ? "등록 중..." : saleType === "INSTANT" ? "즉시판매 등록" : "제안판매 등록"}
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
