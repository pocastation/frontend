"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import PhotoUploadGrid from "@/components/PhotoUploadGrid";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PHASE_OPTIONS } from "@/lib/exchange-labels";
import { GRADE_LABEL, GRADE_OPTIONS, SOURCE_LABEL, SOURCE_OPTIONS } from "@/lib/labels";
import { usePhotoUpload, photoUploadErrorMessage } from "@/lib/use-photo-upload";
import { FOCUS_RING, FORM_ACTION_BAR, FORM_ACTION_BAR_PAD, FORM_ACTION_BAR_STYLE } from "@/lib/ui";
import type {
  ArtistListResponse,
  ArtistMemberResponse,
  EventResponse,
  ExchangePhase,
  PhotocardGrade,
  PhotocardSource,
} from "@/lib/types";

/**
 * 교환글 작성(#662). 위저드라 전역 크롬을 걷고 앱바는 닫기(X) 변형을 쓴다.
 *
 * <p>두 장으로 나눈다. 1장은 포카(사진 + 카탈로그), 2장은 장소·시간대다. 한 화면에 다 넣으면
 * 사진 세 장 업로드만으로 이미 무거운 단계에 입력칸이 여덟 개 더 붙는다.
 *
 * <p>업로드는 {@code usePhotoUpload}를 쓴다. 토큰 만료 재시도와 업로드 전 리사이즈가 그 안에
 * 있고, 복사하면 한쪽만 고치는 일이 생긴다(#647에서 그 이유로 공용 훅으로 모았다).
 */

const MAX_PHOTOS = 3;
const MAX_WANTS = 5;

type Want = { artistId: string; idolId: string; source: PhotocardSource };
type Slot = { phase: ExchangePhase; fromHour: number; toHour: number };

const LABEL = "mb-1.5 text-[12.5px] font-extrabold text-text-2";
const INPUT =
  "h-12 w-full rounded-r1 border border-border-2 bg-white px-3 text-[15px] font-semibold text-text-1";
const HELP = "mt-1.5 text-[11.5px] leading-relaxed text-text-3";

export default function NewExchangePage() {
  return (
    <Suspense fallback={null}>
      <NewExchangeForm />
    </Suspense>
  );
}

function NewExchangeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const { member, fetchWithAuth, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [artists, setArtists] = useState<{ id: number; name: string }[]>([]);
  const [idols, setIdols] = useState<ArtistMemberResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [artistId, setArtistId] = useState("");
  const [idolId, setIdolId] = useState("");
  const [source, setSource] = useState<PhotocardSource>("BROADCAST");
  const [grade, setGrade] = useState<PhotocardGrade>("A");
  const [wants, setWants] = useState<Want[]>([{ artistId: "", idolId: "", source: "BROADCAST" }]);
  const [place, setPlace] = useState("");
  const [slots, setSlots] = useState<Slot[]>([{ phase: "AFTER_END", fromHour: 19, toHour: 20 }]);

  const photos = usePhotoUpload(MAX_PHOTOS, (message) => setError(message));

  useEffect(() => {
    if (authLoading) return;
    if (!member) {
      // 쿼리까지 들고 돌아온다. eventId를 잃으면 로그인한 뒤 어느 행사였는지도 사라진다.
      const back = eventId ? `/exchanges/new?eventId=${eventId}` : "/exchanges/new";
      router.replace(`/login?redirect=${encodeURIComponent(back)}`);
    }
  }, [authLoading, member, eventId, router]);

  /*
    장을 넘기면 맨 위로 올린다. 스크롤 위치는 라우팅이 아니라 상태로 바뀌는 화면에서 그대로
    남는다 — 「다음」은 폼 맨 아래에 있으니 다음 장이 중간부터 보인다. 새 장의 첫 입력칸을
    찾으려면 위로 올려야 한다.

    instant다. 한 화면 분량을 부드럽게 굴리면 넘긴 뒤에도 잠깐 움직이는 화면을 보게 되고,
    장이 바뀌는 일은 페이지 이동에 가깝다.
  */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  useEffect(() => {
    if (!eventId) return;
    apiFetch<EventResponse>(`/api/events/${eventId}`)
      .then(setEvent)
      .catch(() => setEvent(null));
  }, [eventId]);

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

  const step1Ready =
    photos.uploadedUrls.length > 0 && !photos.uploading && artistId !== "" && wants.some((w) => w.artistId !== "");
  const step2Ready = place.trim().length > 0 && slots.length > 0;

  async function submit() {
    if (!eventId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        place: place.trim(),
        have: {
          artistId: Number(artistId),
          idolId: idolId ? Number(idolId) : null,
          source,
          grade,
        },
        wants: wants
          .filter((w) => w.artistId !== "")
          .map((w) => ({
            artistId: Number(w.artistId),
            idolId: w.idolId ? Number(w.idolId) : null,
            source: w.source,
          })),
        slots,
        photos: photos.uploadedUrls,
      };
      const created = await fetchWithAuth<{ id: number }>(`/api/events/${eventId}/exchanges`, {
        method: "POST",
        body,
      });
      router.replace(`/exchanges/${created.id}`);
    } catch (err) {
      setError(photoUploadErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (!eventId) {
    return (
      <>
        <MobilePageHead title="교환글 작성" variant="close" backHref="/events" />
        <p className="px-[14px] py-16 text-center text-[12.5px] text-text-3">
          어느 행사의 교환글인지 알 수 없어요. 캘린더에서 행사를 골라 주세요.
        </p>
      </>
    );
  }

  return (
    <>
      <MobilePageHead
        title="교환글 작성"
        sub={event?.name}
        variant="close"
        backHref={`/events/${eventId}`}
      />

      <div className={`mx-auto max-w-[640px] ${FORM_ACTION_BAR_PAD} sm:px-4 sm:py-8`}>
        <div className="flex gap-1 px-[14px] pt-2.5 sm:px-0" aria-hidden="true">
          <i className="h-0.5 flex-1 rounded-full bg-primary" />
          <i className={`h-0.5 flex-1 rounded-full ${step === 2 ? "bg-primary" : "bg-border-2"}`} />
        </div>

        {error && (
          <p role="alert" className="mx-[14px] mt-3 rounded-r1 border-l-2 border-danger bg-danger-soft px-3 py-2 text-[12.5px] font-semibold text-danger sm:mx-0">
            {error}
          </p>
        )}

        {step === 1 ? (
          <>
            <section className="px-[14px] pt-4 sm:px-0">
              <p className={LABEL}>
                내가 가진 포카<span className="ml-0.5 text-primary">*</span>
              </p>
              <PhotoUploadGrid
                items={photos.items}
                max={MAX_PHOTOS}
                onAddFiles={addFiles}
                onRemove={photos.removeItem}
                onReorder={photos.setItems}
              />
              <p className={HELP}>최대 {MAX_PHOTOS}장. 행사가 끝나고 30일 뒤 자동으로 지워져요.</p>
            </section>

            <section className="mt-6 px-[14px] sm:px-0">
              <p className={LABEL}>
                어떤 포카인가요<span className="ml-0.5 text-primary">*</span>
              </p>
              <select value={artistId} onChange={(e) => setArtistId(e.target.value)} className={INPUT} aria-label="스타">
                <option value="">스타를 선택하세요</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className={HELP}>골라야 교환 상대를 찾아줄 수 있어요.</p>

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

              <p className={`${LABEL} mt-5`}>
                받고 싶은 포카<span className="ml-0.5 text-primary">*</span>
              </p>
              {wants.map((want, index) => (
                <WantRow
                  key={index}
                  want={want}
                  artists={artists}
                  onChange={(next) => setWants(wants.map((w, i) => (i === index ? next : w)))}
                  onRemove={wants.length > 1 ? () => setWants(wants.filter((_, i) => i !== index)) : undefined}
                />
              ))}
              {wants.length < MAX_WANTS && (
                <button
                  type="button"
                  onClick={() => setWants([...wants, { artistId: "", idolId: "", source: "BROADCAST" }])}
                  className={`mt-2 h-10 w-full rounded-r1 border border-border-2 bg-white text-[13px] font-extrabold text-text-2 ${FOCUS_RING}`}
                >
                  받고 싶은 포카 추가
                </button>
              )}
              <p className={HELP}>여러 개를 고를 수 있어요. 사진은 필요 없어요.</p>
            </section>

            <div className={FORM_ACTION_BAR} style={FORM_ACTION_BAR_STYLE}>
              <button
                type="button"
                disabled={!step1Ready}
                onClick={() => setStep(2)}
                className={`h-12 w-full rounded-[7px] bg-primary text-[15px] font-extrabold text-white disabled:opacity-50 ${FOCUS_RING}`}
              >
                다음
              </button>
            </div>
          </>
        ) : (
          <>
            <section className="px-[14px] pt-4 sm:px-0">
              <p className={LABEL}>
                만날 곳<span className="ml-0.5 text-primary">*</span>
              </p>
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                maxLength={60}
                placeholder="상암 MBC 1번 출구 앞"
                className={INPUT}
              />
              <p className={HELP}>행사장 안에서 서로 찾을 수 있는 지점으로 적어 주세요.</p>
            </section>

            <section className="mt-6 px-[14px] sm:px-0">
              <p className={LABEL}>
                만날 수 있는 시간<span className="ml-0.5 text-primary">*</span>
              </p>
              {slots.map((slot, index) => (
                <SlotRow
                  key={index}
                  slot={slot}
                  onChange={(next) => setSlots(slots.map((s, i) => (i === index ? next : s)))}
                  onRemove={slots.length > 1 ? () => setSlots(slots.filter((_, i) => i !== index)) : undefined}
                />
              ))}
              {slots.length < 4 && (
                <button
                  type="button"
                  onClick={() => setSlots([...slots, { phase: "AFTER_END", fromHour: 20, toHour: 21 }])}
                  className={`mt-2 h-10 w-full rounded-r1 border border-border-2 bg-white text-[13px] font-extrabold text-text-2 ${FOCUS_RING}`}
                >
                  시간대 추가
                </button>
              )}
              <p className={HELP}>
                사녹·본방이 밀릴 수 있어 정확한 시각 대신 행사 기준으로 받아요. 여러 개를 제시하면 맞는 사람이 늘어나요.
              </p>
            </section>

            <div className={`flex gap-2 ${FORM_ACTION_BAR}`} style={FORM_ACTION_BAR_STYLE}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`h-12 flex-1 rounded-[7px] border border-border-2 bg-white text-[15px] font-extrabold text-text-2 ${FOCUS_RING}`}
              >
                이전
              </button>
              <button
                type="button"
                disabled={!step2Ready || submitting}
                onClick={submit}
                className={`h-12 flex-[2] rounded-[7px] bg-primary text-[15px] font-extrabold text-white disabled:opacity-50 ${FOCUS_RING}`}
              >
                {submitting ? "등록 중…" : "교환글 등록"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function WantRow({
  want,
  artists,
  onChange,
  onRemove,
}: {
  want: Want;
  artists: { id: number; name: string }[];
  onChange: (next: Want) => void;
  onRemove?: () => void;
}) {
  const [idols, setIdols] = useState<ArtistMemberResponse[]>([]);

  useEffect(() => {
    if (!want.artistId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 스타를 비우면 멤버 목록도 즉시 버린다.
      setIdols([]);
      return;
    }
    apiFetch<{ content: ArtistMemberResponse[] }>(`/api/artists/${want.artistId}/idols`)
      .then((res) => setIdols(res.content))
      .catch(() => setIdols([]));
  }, [want.artistId]);

  return (
    <div className="mt-2 flex gap-2">
      <select
        value={want.artistId}
        onChange={(e) => onChange({ ...want, artistId: e.target.value, idolId: "" })}
        aria-label="받고 싶은 스타"
        className={INPUT}
      >
        <option value="">스타</option>
        {artists.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <select
        value={want.idolId}
        onChange={(e) => onChange({ ...want, idolId: e.target.value })}
        disabled={idols.length === 0}
        aria-label="받고 싶은 멤버"
        className={`${INPUT} disabled:bg-surface-3 disabled:text-text-3`}
      >
        <option value="">멤버</option>
        {idols.map((i) => (
          <option key={i.idolId} value={i.idolId}>{i.stageName}</option>
        ))}
      </select>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="이 항목 삭제"
          className={`h-12 w-11 shrink-0 rounded-r1 border border-border-2 bg-white text-text-3 ${FOCUS_RING}`}
        >
          ×
        </button>
      )}
    </div>
  );
}

function SlotRow({
  slot,
  onChange,
  onRemove,
}: {
  slot: Slot;
  onChange: (next: Slot) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="mt-2 flex gap-2">
      <select
        value={slot.phase}
        onChange={(e) => onChange({ ...slot, phase: e.target.value as ExchangePhase })}
        aria-label="만날 시점"
        className={INPUT}
      >
        {PHASE_OPTIONS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <select
        value={slot.fromHour}
        onChange={(e) => {
          const from = Number(e.target.value);
          onChange({ ...slot, fromHour: from, toHour: Math.max(from + 1, slot.toHour) });
        }}
        aria-label="시작 시각"
        className={INPUT}
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>{h}시</option>
        ))}
      </select>
      <select
        value={slot.toHour}
        onChange={(e) => onChange({ ...slot, toHour: Number(e.target.value) })}
        aria-label="종료 시각"
        className={INPUT}
      >
        {Array.from({ length: 24 }, (_, i) => i + 1)
          .filter((h) => h > slot.fromHour)
          .map((h) => (
            <option key={h} value={h}>{h}시</option>
          ))}
      </select>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="이 시간대 삭제"
          className={`h-12 w-11 shrink-0 rounded-r1 border border-border-2 bg-white text-text-3 ${FOCUS_RING}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
