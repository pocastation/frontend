"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type {
  ArtistListResponse,
  ArtistMemberResponse,
  ArtistResponse,
  ArtistStatus,
  ArtistType,
  MemberResponse,
  ParentAgency,
} from "@/lib/types";

type IdolResponse = {
  id: number;
  stageName: string;
  stageNameEn: string | null;
  realName: string | null;
  birthDate: string | null;
  imageUrl: string | null;
};

type Notice = { kind: "success" | "error"; text: string };
type SubmittingTarget = "artist" | "idol" | "membership" | null;

const ARTIST_TYPE_LABEL: Record<ArtistType, string> = {
  GROUP: "그룹",
  SOLO: "솔로",
  UNIT: "유닛",
};

const ARTIST_STATUS_LABEL: Record<ArtistStatus, string> = {
  ACTIVE: "활동",
  HIATUS: "휴식",
  DISBANDED: "해체",
};
const ARTIST_STATUS_OPTIONS: ArtistStatus[] = ["ACTIVE", "HIATUS", "DISBANDED"];
const PARENT_AGENCY_OPTIONS: ParentAgency[] = ["HYBE", "SM", "JYP", "YG"];

type EditForm = {
  name: string;
  nameEn: string;
  agency: string;
  fandomName: string;
  debutDate: string;
  imageUrl: string;
  status: ArtistStatus;
  visible: boolean;
  parentAgency: "" | ParentAgency;
};

const initialArtistForm = {
  name: "",
  nameEn: "",
  type: "GROUP" as ArtistType,
  agency: "",
  fandomName: "",
  debutDate: "",
  parentArtistId: "",
  imageUrl: "",
};

const initialIdolForm = {
  stageName: "",
  stageNameEn: "",
  realName: "",
  birthDate: "",
  imageUrl: "",
};

const initialMembershipForm = {
  artistId: "",
  idolId: "",
  joinedAt: "",
};

function isAdmin(member: MemberResponse | null): boolean {
  return member?.role === "ADMIN" || member?.role === "ROLE_ADMIN";
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function AdminCatalogPage() {
  const { accessToken, member, fetchWithAuth } = useAuth();
  const canUseAdmin = isAdmin(member);

  const [artists, setArtists] = useState<ArtistResponse[]>([]);
  const [artistTotal, setArtistTotal] = useState(0);
  const [selectedArtistId, setSelectedArtistId] = useState<number | "">("");
  const [artistMembers, setArtistMembers] = useState<ArtistMemberResponse[]>([]);
  const [recentIdol, setRecentIdol] = useState<IdolResponse | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [submitting, setSubmitting] = useState<SubmittingTarget>(null);

  const [artistForm, setArtistForm] = useState(initialArtistForm);
  const [idolForm, setIdolForm] = useState(initialIdolForm);
  const [membershipForm, setMembershipForm] = useState(initialMembershipForm);
  const [editing, setEditing] = useState<ArtistResponse | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [mobileForm, setMobileForm] = useState<"artist" | "idol" | "membership" | null>(null);

  const loadOverview = useCallback(async () => {
    setIsDataLoading(true);
    setNotice(null);
    try {
      // 관리자 목록은 숨김(visible=false) 스타도 포함하고 편집에 필요한 전 필드를 담는다(#148).
      const artistRes = await fetchWithAuth<ArtistListResponse>("/api/admin/artists?size=300");
      setArtists(artistRes.content);
      setArtistTotal(artistRes.totalElements);
    } catch (err) {
      setNotice({ kind: "error", text: getErrorMessage(err, "관리자 데이터를 불러오지 못했습니다.") });
    } finally {
      setIsDataLoading(false);
    }
  }, [fetchWithAuth]);

  const loadArtistMembers = useCallback(async (artistId: number) => {
    try {
      const res = await apiFetch<{ content: ArtistMemberResponse[] }>(`/api/artists/${artistId}/idols`, {
        cache: "no-store",
      });
      setArtistMembers(res.content);
    } catch (err) {
      setArtistMembers([]);
      setNotice({ kind: "error", text: getErrorMessage(err, "스타 멤버를 불러오지 못했습니다.") });
    }
  }, []);

  useEffect(() => {
    // 인증·관리자 권한 가드는 상위 app/admin/layout.tsx가 이미 보장한다 — 여기선 데이터만 1회 로드.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 카탈로그 데이터 동기화.
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (selectedArtistId === "") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 선택된 스타가 바뀔 때 서버 멤버 목록을 동기화한다.
    void loadArtistMembers(selectedArtistId);
  }, [loadArtistMembers, selectedArtistId]);

  function handleArtistSelect(value: string) {
    const next = value ? Number(value) : "";
    setSelectedArtistId(next);
    setArtistMembers([]);
  }

  async function handleCreateArtist(e: FormEvent) {
    e.preventDefault();
    if (!canUseAdmin || !accessToken) return;

    setSubmitting("artist");
    setNotice(null);
    try {
      const created = await fetchWithAuth<ArtistResponse>("/api/admin/artists", {
        method: "POST",
        body: {
          name: artistForm.name.trim(),
          nameEn: optionalText(artistForm.nameEn),
          type: artistForm.type,
          agency: optionalText(artistForm.agency),
          fandomName: optionalText(artistForm.fandomName),
          debutDate: optionalText(artistForm.debutDate),
          parentArtistId: optionalNumber(artistForm.parentArtistId),
          imageUrl: optionalText(artistForm.imageUrl),
        },
      });
      setArtistForm(initialArtistForm);
      setArtists((prev) => [created, ...prev]);
      setArtistTotal((prev) => prev + 1);
      setNotice({ kind: "success", text: `${created.name} 스타를 등록했습니다.` });
    } catch (err) {
      setNotice({ kind: "error", text: getErrorMessage(err, "스타 등록에 실패했습니다.") });
    } finally {
      setSubmitting(null);
    }
  }

  // 편집 모달 열기 — 전 필드 프리필(updateProfile이 전체 덮어쓰기라 현재값 보존이 필수).
  function openEdit(artist: ArtistResponse) {
    setEditing(artist);
    setEditForm({
      name: artist.name,
      nameEn: artist.nameEn ?? "",
      agency: artist.agency ?? "",
      fandomName: artist.fandomName ?? "",
      debutDate: artist.debutDate ?? "",
      imageUrl: artist.imageUrl ?? "",
      status: artist.status,
      visible: artist.visible,
      parentAgency: artist.parentAgency ?? "",
    });
    setNotice(null);
  }

  async function handleUpdateArtist(e: FormEvent) {
    e.preventDefault();
    if (!canUseAdmin || !accessToken || !editing || !editForm) return;

    setEditSubmitting(true);
    setNotice(null);
    try {
      const updated = await fetchWithAuth<ArtistResponse>(`/api/admin/artists/${editing.id}`, {
        method: "PATCH",
        body: {
          name: editForm.name.trim(),
          nameEn: optionalText(editForm.nameEn),
          agency: optionalText(editForm.agency),
          fandomName: optionalText(editForm.fandomName),
          debutDate: optionalText(editForm.debutDate),
          imageUrl: optionalText(editForm.imageUrl),
          status: editForm.status,
          visible: editForm.visible,
          parentAgency: editForm.parentAgency || null,
        },
      });
      setArtists((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditing(null);
      setEditForm(null);
      setNotice({ kind: "success", text: `${updated.name} 정보를 수정했습니다.` });
    } catch (err) {
      setNotice({ kind: "error", text: getErrorMessage(err, "스타 수정에 실패했습니다.") });
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleCreateIdol(e: FormEvent) {
    e.preventDefault();
    if (!canUseAdmin || !accessToken) return;

    setSubmitting("idol");
    setNotice(null);
    try {
      const created = await fetchWithAuth<IdolResponse>("/api/admin/idols", {
        method: "POST",
        body: {
          stageName: idolForm.stageName.trim(),
          stageNameEn: optionalText(idolForm.stageNameEn),
          realName: optionalText(idolForm.realName),
          birthDate: optionalText(idolForm.birthDate),
          imageUrl: optionalText(idolForm.imageUrl),
        },
      });
      setRecentIdol(created);
      setIdolForm(initialIdolForm);
      setMembershipForm((prev) => ({ ...prev, idolId: String(created.id) }));
      setNotice({ kind: "success", text: `${created.stageName} 멤버를 등록했습니다. 연결 폼에 ID를 채워뒀어요.` });
    } catch (err) {
      setNotice({ kind: "error", text: getErrorMessage(err, "멤버 등록에 실패했습니다.") });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleAddMembership(e: FormEvent) {
    e.preventDefault();
    if (!canUseAdmin || !accessToken) return;

    const artistId = Number(membershipForm.artistId);
    const idolId = Number(membershipForm.idolId);
    if (!artistId || !idolId) {
      setNotice({ kind: "error", text: "스타와 멤버 ID를 모두 입력해주세요." });
      return;
    }

    setSubmitting("membership");
    setNotice(null);
    try {
      await fetchWithAuth<void>(`/api/admin/artists/${artistId}/idols`, {
        method: "POST",
        body: {
          idolId,
          joinedAt: optionalText(membershipForm.joinedAt),
        },
      });
      setNotice({ kind: "success", text: "스타와 멤버를 연결했습니다." });
      setMembershipForm((prev) => ({ ...prev, joinedAt: "" }));
      if (selectedArtistId === artistId) {
        await loadArtistMembers(artistId);
      }
    } catch (err) {
      setNotice({ kind: "error", text: getErrorMessage(err, "멤버 연결에 실패했습니다.") });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-1">카탈로그 관리</h1>
          <p className="mt-1.5 text-sm text-text-3">스타·멤버 마스터데이터를 등록하고 관리합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={isDataLoading}
          className={`h-9 px-4 ${SECONDARY_BUTTON_CLASS}`}
        >
          {isDataLoading ? "새로고침 중" : "새로고침"}
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className={`mt-5 rounded-r2 border px-4 py-3 text-sm font-semibold ${
            notice.kind === "success"
              ? "border-ok/20 bg-ok-soft text-ok"
              : "border-accent/20 bg-accent-soft text-accent"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="mt-5 lg:hidden">
        {mobileForm ? (
          <button type="button" onClick={() => setMobileForm(null)} className={`text-sm font-bold text-text-2 ${FOCUS_RING}`}>‹ 목록으로</button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {([['artist', '스타 등록'], ['idol', '멤버 등록'], ['membership', '멤버 연결']] as const).map(([form, label]) => (
              <button key={form} type="button" onClick={() => setMobileForm(form)} className={`border border-border-2 px-2 text-xs font-bold text-text-2 ${FOCUS_RING}`}>{label}</button>
            ))}
          </div>
        )}
      </div>
      <section className={`mt-6 rounded-r2 border border-border bg-white p-4 ${mobileForm ? "hidden lg:block" : ""}`}>
        <h2 className="font-display text-base font-extrabold text-text-1">카탈로그 요약</h2>
        <p className="mt-1 text-xs text-text-3">등록된 스타와 운영 상태입니다.</p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xs">
          <div className="rounded-r2 bg-surface-2 p-3">
            <p className="text-xs text-text-3">스타</p>
            <p className="mt-1 font-display text-xl font-extrabold text-text-1">
              {artistTotal.toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="rounded-r2 bg-surface-2 p-3">
            <p className="text-xs text-text-3">활동중</p>
            <p className="mt-1 font-display text-xl font-extrabold text-primary">
              {artists.filter((artist) => artist.status === "ACTIVE").length.toLocaleString("ko-KR")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-x-4 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
              <div
                key={artist.id}
                className="flex items-center justify-between gap-2 border-b border-border py-2.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    handleArtistSelect(String(artist.id));
                    setMembershipForm((prev) => ({ ...prev, artistId: String(artist.id) }));
                    setMobileForm("membership");
                  }}
                  className={`flex flex-1 items-center justify-between gap-3 text-left ${FOCUS_RING}`}
                >
                  <span>
                    <span className="block text-sm font-bold text-text-1">
                      {artist.name}
                      {!artist.visible && <span className="ml-1 text-[11px] font-semibold text-text-3">· 숨김</span>}
                    </span>
                    <span className="text-xs text-text-3">
                      {ARTIST_TYPE_LABEL[artist.type]} · {artist.agency ?? "소속사 미입력"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-3 px-2 py-1 text-[11px] font-bold text-text-2">
                    {ARTIST_STATUS_LABEL[artist.status]}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(artist)}
                  className={`shrink-0 rounded-full border border-border-2 px-2.5 py-1 text-xs font-bold text-text-2 transition-colors hover:border-primary hover:text-primary ${FOCUS_RING}`}
                >
                  편집
                </button>
              </div>
          ))}
        </div>
      </section>

      <section className={`admin-catalog-forms mt-6 gap-4 lg:grid lg:grid-cols-3 ${mobileForm ? "grid" : "hidden"}`}>
        <form onSubmit={handleCreateArtist} className={`rounded-r2 border border-border bg-white p-4 ${mobileForm === "artist" ? "" : "hidden lg:block"}`}>
          <h2 className="font-display text-base font-extrabold text-text-1">스타 등록</h2>
          <div className="mt-4 flex flex-col gap-3">
            <input
              required
              maxLength={100}
              placeholder="스타명 *"
              value={artistForm.name}
              onChange={(e) => setArtistForm((prev) => ({ ...prev, name: e.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              maxLength={100}
              placeholder="영문명"
              value={artistForm.nameEn}
              onChange={(e) => setArtistForm((prev) => ({ ...prev, nameEn: e.target.value }))}
              className={INPUT_CLASS}
            />
            <select
              aria-label="스타 유형"
              value={artistForm.type}
              onChange={(e) => setArtistForm((prev) => ({ ...prev, type: e.target.value as ArtistType }))}
              className={INPUT_CLASS}
            >
              {Object.entries(ARTIST_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                maxLength={100}
                placeholder="소속사"
                value={artistForm.agency}
                onChange={(e) => setArtistForm((prev) => ({ ...prev, agency: e.target.value }))}
                className={INPUT_CLASS}
              />
              <input
                maxLength={50}
                placeholder="팬덤명"
                value={artistForm.fandomName}
                onChange={(e) => setArtistForm((prev) => ({ ...prev, fandomName: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <input
              type="date"
              aria-label="데뷔일"
              value={artistForm.debutDate}
              onChange={(e) => setArtistForm((prev) => ({ ...prev, debutDate: e.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              inputMode="numeric"
              placeholder="상위 스타 ID"
              value={artistForm.parentArtistId}
              onChange={(e) => setArtistForm((prev) => ({ ...prev, parentArtistId: e.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              maxLength={500}
              placeholder="이미지 URL"
              value={artistForm.imageUrl}
              onChange={(e) => setArtistForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              className={INPUT_CLASS}
            />
            <button type="submit" disabled={submitting === "artist"} className={`mt-1 h-11 ${PRIMARY_BUTTON_CLASS}`}>
              {submitting === "artist" ? "등록 중..." : "스타 등록"}
            </button>
          </div>
        </form>

        <form onSubmit={handleCreateIdol} className={`rounded-r2 border border-border bg-white p-4 ${mobileForm === "idol" ? "" : "hidden lg:block"}`}>
          <h2 className="font-display text-base font-extrabold text-text-1">멤버 등록</h2>
          <div className="mt-4 flex flex-col gap-3">
            <input
              required
              maxLength={50}
              placeholder="활동명 *"
              value={idolForm.stageName}
              onChange={(e) => setIdolForm((prev) => ({ ...prev, stageName: e.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              maxLength={50}
              placeholder="영문 활동명"
              value={idolForm.stageNameEn}
              onChange={(e) => setIdolForm((prev) => ({ ...prev, stageNameEn: e.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              maxLength={50}
              placeholder="본명"
              value={idolForm.realName}
              onChange={(e) => setIdolForm((prev) => ({ ...prev, realName: e.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              type="date"
              aria-label="생년월일"
              value={idolForm.birthDate}
              onChange={(e) => setIdolForm((prev) => ({ ...prev, birthDate: e.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              maxLength={500}
              placeholder="이미지 URL"
              value={idolForm.imageUrl}
              onChange={(e) => setIdolForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              className={INPUT_CLASS}
            />
            {recentIdol && (
              <p className="rounded-r2 bg-surface-2 px-3 py-2 text-xs font-semibold text-text-2">
                최근 생성 ID: {recentIdol.id} · {recentIdol.stageName}
              </p>
            )}
            <button type="submit" disabled={submitting === "idol"} className={`mt-1 h-11 ${PRIMARY_BUTTON_CLASS}`}>
              {submitting === "idol" ? "등록 중..." : "멤버 등록"}
            </button>
          </div>
        </form>

        <form onSubmit={handleAddMembership} className={`rounded-r2 border border-border bg-white p-4 ${mobileForm === "membership" ? "" : "hidden lg:block"}`}>
          <h2 className="font-display text-base font-extrabold text-text-1">스타-멤버 연결</h2>
          <div className="mt-4 flex flex-col gap-3">
            <select
              required
              aria-label="연결할 스타"
              value={membershipForm.artistId}
              onChange={(e) => {
                setMembershipForm((prev) => ({ ...prev, artistId: e.target.value }));
                handleArtistSelect(e.target.value);
              }}
              className={INPUT_CLASS}
            >
              <option value="">스타 선택 *</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name} · #{artist.id}
                </option>
              ))}
            </select>
            <input
              required
              inputMode="numeric"
              placeholder="멤버 ID *"
              value={membershipForm.idolId}
              onChange={(e) => setMembershipForm((prev) => ({ ...prev, idolId: e.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              type="date"
              aria-label="합류일"
              value={membershipForm.joinedAt}
              onChange={(e) => setMembershipForm((prev) => ({ ...prev, joinedAt: e.target.value }))}
              className={INPUT_CLASS}
            />
            <button
              type="submit"
              disabled={submitting === "membership"}
              className={`mt-1 h-11 ${PRIMARY_BUTTON_CLASS}`}
            >
              {submitting === "membership" ? "연결 중..." : "멤버 연결"}
            </button>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-xs font-extrabold text-text-3">선택 스타 멤버</h3>
            <div className="mt-2 max-h-[160px] overflow-y-auto">
              {artistMembers.length > 0 ? (
                <div className="divide-y divide-border">
                  {artistMembers.map((artistMember) => (
                    <div
                      key={`${artistMember.idolId}-${artistMember.joinedAt ?? "none"}`}
                      className="flex justify-between gap-3 py-2 text-sm"
                    >
                      <span className="font-bold text-text-1">{artistMember.stageName}</span>
                      <span className="text-xs text-text-3">{artistMember.active ? "활동" : "비활동"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-sm text-text-3">스타를 선택하면 연결된 멤버가 표시됩니다.</p>
              )}
            </div>
          </div>
        </form>
      </section>

      {editing && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="스타 편집"
        >
          <form
            onSubmit={handleUpdateArtist}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-r3 bg-surface p-5 shadow-modal"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold text-text-1">
                스타 편집 · {editing.name}
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => {
                  setEditing(null);
                  setEditForm(null);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-text-3 hover:text-text-1 ${FOCUS_RING}`}
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-[11px] text-text-3">
              타입({ARTIST_TYPE_LABEL[editing.type]})은 여기서 바꿀 수 없어요. 이미지는 자체제작·라이선스 보유분만 권장.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <input
                required
                maxLength={100}
                placeholder="이름 *"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => (p ? { ...p, name: e.target.value } : p))}
                className={INPUT_CLASS}
              />
              <input
                maxLength={100}
                placeholder="영문명"
                value={editForm.nameEn}
                onChange={(e) => setEditForm((p) => (p ? { ...p, nameEn: e.target.value } : p))}
                className={INPUT_CLASS}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  maxLength={100}
                  placeholder="소속사"
                  value={editForm.agency}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, agency: e.target.value } : p))}
                  className={INPUT_CLASS}
                />
                <input
                  maxLength={50}
                  placeholder="팬덤명"
                  value={editForm.fandomName}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, fandomName: e.target.value } : p))}
                  className={INPUT_CLASS}
                />
              </div>
              <input
                type="date"
                value={editForm.debutDate}
                onChange={(e) => setEditForm((p) => (p ? { ...p, debutDate: e.target.value } : p))}
                className={INPUT_CLASS}
              />
              <input
                maxLength={500}
                placeholder="이미지 URL"
                value={editForm.imageUrl}
                onChange={(e) => setEditForm((p) => (p ? { ...p, imageUrl: e.target.value } : p))}
                className={INPUT_CLASS}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, status: e.target.value as ArtistStatus } : p))}
                  className={INPUT_CLASS}
                >
                  {ARTIST_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {ARTIST_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <select
                  value={editForm.parentAgency}
                  onChange={(e) =>
                    setEditForm((p) => (p ? { ...p, parentAgency: e.target.value as "" | ParentAgency } : p))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">빅4 미분류</option>
                  {PARENT_AGENCY_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex w-fit items-center gap-2 text-sm text-text-2">
                <input
                  type="checkbox"
                  checked={editForm.visible}
                  onChange={(e) => setEditForm((p) => (p ? { ...p, visible: e.target.checked } : p))}
                  className={`h-4 w-4 accent-primary ${FOCUS_RING}`}
                />
                공개(노출)
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setEditForm(null);
                }}
                className={`h-11 flex-1 ${SECONDARY_BUTTON_CLASS}`}
              >
                취소
              </button>
              <button type="submit" disabled={editSubmitting} className={`h-11 flex-1 ${PRIMARY_BUTTON_CLASS}`}>
                {editSubmitting ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
