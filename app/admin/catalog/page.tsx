"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW, formatTimeLeft, isEndingSoon } from "@/lib/format";
import { FOCUS_RING, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type {
  ArtistListResponse,
  ArtistMemberResponse,
  ArtistResponse,
  ArtistStatus,
  ArtistType,
  AuctionListResponse,
  AuctionResponse,
  AuctionStatus,
  MemberResponse,
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

const AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  DRAFT: "임시저장",
  PENDING_REVIEW: "검수 대기",
  APPROVED: "승인",
  REJECTED: "반려",
  SCHEDULED: "시작 예정",
  LIVE: "진행 중",
  ENDED_SOLD: "낙찰 종료",
  ENDED_NO_BIDS: "유찰",
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

function AdminStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "accent";
}) {
  const toneClass =
    tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent" : "text-text-1";

  return (
    <div className="rounded-r2 border border-border bg-white p-4 shadow-card">
      <p className="text-xs font-bold text-text-3">{label}</p>
      <p className={`mt-2 font-display text-2xl font-extrabold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { accessToken, member, isLoading, fetchWithAuth } = useAuth();
  const canUseAdmin = isAdmin(member);

  const [auctions, setAuctions] = useState<AuctionResponse[]>([]);
  const [auctionTotal, setAuctionTotal] = useState(0);
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

  const loadOverview = useCallback(async () => {
    setIsDataLoading(true);
    setNotice(null);
    try {
      const [auctionRes, artistRes] = await Promise.all([
        apiFetch<AuctionListResponse>("/api/auctions?size=80", { cache: "no-store" }),
        apiFetch<ArtistListResponse>("/api/artists?size=120", { cache: "no-store" }),
      ]);
      setAuctions(auctionRes.content);
      setAuctionTotal(auctionRes.totalElements);
      setArtists(artistRes.content);
      setArtistTotal(artistRes.totalElements);
    } catch (err) {
      setNotice({ kind: "error", text: getErrorMessage(err, "관리자 데이터를 불러오지 못했습니다.") });
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  const loadArtistMembers = useCallback(async (artistId: number) => {
    try {
      const res = await apiFetch<{ content: ArtistMemberResponse[] }>(`/api/artists/${artistId}/idols`, {
        cache: "no-store",
      });
      setArtistMembers(res.content);
    } catch (err) {
      setArtistMembers([]);
      setNotice({ kind: "error", text: getErrorMessage(err, "아티스트 멤버를 불러오지 못했습니다.") });
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) {
      router.replace("/login?redirect=/admin");
      return;
    }
    if (canUseAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 인증 상태가 확정된 뒤 외부 API 데이터를 동기화한다.
      void loadOverview();
    }
  }, [accessToken, canUseAdmin, isLoading, loadOverview, router]);

  useEffect(() => {
    if (!canUseAdmin || selectedArtistId === "") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 선택된 아티스트가 바뀔 때 서버 멤버 목록을 동기화한다.
    void loadArtistMembers(selectedArtistId);
  }, [canUseAdmin, loadArtistMembers, selectedArtistId]);

  const dashboard = useMemo(() => {
    const totalBids = auctions.reduce((sum, auction) => sum + auction.bidCount, 0);
    const totalViews = auctions.reduce((sum, auction) => sum + auction.viewCount, 0);
    const highestPrice = auctions.reduce((max, auction) => Math.max(max, auction.currentPrice), 0);
    const endingSoonCount = auctions.filter((auction) => isEndingSoon(auction.endAt)).length;
    const statusCounts = auctions.reduce<Record<string, number>>((acc, auction) => {
      acc[auction.status] = (acc[auction.status] ?? 0) + 1;
      return acc;
    }, {});

    return { totalBids, totalViews, highestPrice, endingSoonCount, statusCounts };
  }, [auctions]);

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
      setNotice({ kind: "success", text: `${created.name} 아티스트를 등록했습니다.` });
    } catch (err) {
      setNotice({ kind: "error", text: getErrorMessage(err, "아티스트 등록에 실패했습니다.") });
    } finally {
      setSubmitting(null);
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
      setNotice({ kind: "error", text: "아티스트와 멤버 ID를 모두 입력해주세요." });
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
      setNotice({ kind: "success", text: "아티스트와 멤버를 연결했습니다." });
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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">
        관리자 권한을 확인하는 중...
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">
        로그인 페이지로 이동 중...
      </div>
    );
  }

  if (!canUseAdmin) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-xs font-extrabold tracking-wide text-accent">ACCESS DENIED</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-text-1">관리자 권한이 필요합니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-3">
          현재 계정은 {member?.role ?? "알 수 없음"} 권한입니다. 관리자 계정으로 로그인한 뒤 다시 접근해주세요.
        </p>
        <Link href="/" className={`mt-6 inline-flex h-11 items-center px-5 ${SECONDARY_BUTTON_CLASS}`}>
          홈으로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1160px] px-4 py-8 sm:py-10">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-wide text-primary">POCASTATION ADMIN</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-text-1">관리자 콘솔</h1>
          <p className="mt-2 text-sm text-text-3">
            경매 흐름, 카탈로그 데이터, 신규 아티스트/멤버 등록을 한 화면에서 관리합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-extrabold text-primary">
            {member?.nickname} · ADMIN
          </span>
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={isDataLoading}
            className={`h-9 px-4 ${SECONDARY_BUTTON_CLASS}`}
          >
            {isDataLoading ? "새로고침 중" : "새로고침"}
          </button>
        </div>
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

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat label="노출 중 경매" value={`${auctionTotal.toLocaleString("ko-KR")}개`} tone="primary" />
        <AdminStat label="총 입찰 수" value={`${dashboard.totalBids.toLocaleString("ko-KR")}회`} />
        <AdminStat label="마감 임박" value={`${dashboard.endingSoonCount.toLocaleString("ko-KR")}개`} tone="accent" />
        <AdminStat label="최고 현재가" value={formatKRW(dashboard.highestPrice)} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-r2 border border-border bg-white p-4 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-extrabold text-text-1">경매 운영 현황</h2>
              <p className="mt-1 text-xs text-text-3">현재 목록 API에 노출되는 경매 기준입니다.</p>
            </div>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-text-2">
              조회 {dashboard.totalViews.toLocaleString("ko-KR")}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border text-xs text-text-3">
                <tr>
                  <th className="py-2 pr-3 font-bold">경매</th>
                  <th className="py-2 pr-3 font-bold">상태</th>
                  <th className="py-2 pr-3 font-bold">현재가</th>
                  <th className="py-2 pr-3 font-bold">입찰/조회</th>
                  <th className="py-2 pr-3 font-bold">마감</th>
                  <th className="py-2 font-bold">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auctions.slice(0, 8).map((auction) => (
                  <tr key={auction.id}>
                    <td className="py-3 pr-3">
                      <p className="max-w-[260px] truncate font-bold text-text-1">{auction.title}</p>
                      <p className="mt-0.5 text-xs text-text-3">{auction.artistName ?? "아티스트 미지정"}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary">
                        {AUCTION_STATUS_LABEL[auction.status] ?? auction.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-display font-bold text-text-1">{formatKRW(auction.currentPrice)}</td>
                    <td className="py-3 pr-3 text-xs text-text-2">
                      {auction.bidCount}회 · {auction.viewCount}뷰
                    </td>
                    <td className="py-3 pr-3 text-xs font-semibold text-text-2">{formatTimeLeft(auction.endAt)}</td>
                    <td className="py-3">
                      <Link
                        href={`/auctions/${auction.id}`}
                        className={`rounded-full text-xs font-bold text-primary hover:underline ${FOCUS_RING}`}
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
                {auctions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-text-3">
                      노출 중인 경매가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-r2 border border-border bg-white p-4 shadow-card">
          <h2 className="font-display text-base font-extrabold text-text-1">카탈로그 요약</h2>
          <p className="mt-1 text-xs text-text-3">등록된 아티스트와 운영 상태입니다.</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-r2 bg-surface-2 p-3">
              <p className="text-xs text-text-3">아티스트</p>
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

          <div className="mt-4 max-h-[330px] overflow-y-auto">
            <div className="divide-y divide-border">
              {artists.slice(0, 14).map((artist) => (
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => {
                    handleArtistSelect(String(artist.id));
                    setMembershipForm((prev) => ({ ...prev, artistId: String(artist.id) }));
                  }}
                  className={`flex w-full items-center justify-between gap-3 py-2.5 text-left ${FOCUS_RING}`}
                >
                  <span>
                    <span className="block text-sm font-bold text-text-1">{artist.name}</span>
                    <span className="text-xs text-text-3">
                      {ARTIST_TYPE_LABEL[artist.type]} · {artist.agency ?? "소속사 미입력"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-3 px-2 py-1 text-[11px] font-bold text-text-2">
                    {ARTIST_STATUS_LABEL[artist.status]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <form onSubmit={handleCreateArtist} className="rounded-r2 border border-border bg-white p-4 shadow-card">
          <h2 className="font-display text-base font-extrabold text-text-1">아티스트 등록</h2>
          <div className="mt-4 flex flex-col gap-3">
            <input
              required
              maxLength={100}
              placeholder="아티스트명 *"
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
              value={artistForm.debutDate}
              onChange={(e) => setArtistForm((prev) => ({ ...prev, debutDate: e.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              inputMode="numeric"
              placeholder="상위 아티스트 ID"
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
              {submitting === "artist" ? "등록 중..." : "아티스트 등록"}
            </button>
          </div>
        </form>

        <form onSubmit={handleCreateIdol} className="rounded-r2 border border-border bg-white p-4 shadow-card">
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

        <form onSubmit={handleAddMembership} className="rounded-r2 border border-border bg-white p-4 shadow-card">
          <h2 className="font-display text-base font-extrabold text-text-1">아티스트-멤버 연결</h2>
          <div className="mt-4 flex flex-col gap-3">
            <select
              required
              value={membershipForm.artistId}
              onChange={(e) => {
                setMembershipForm((prev) => ({ ...prev, artistId: e.target.value }));
                handleArtistSelect(e.target.value);
              }}
              className={INPUT_CLASS}
            >
              <option value="">아티스트 선택 *</option>
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
            <h3 className="text-xs font-extrabold text-text-3">선택 아티스트 멤버</h3>
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
                <p className="py-4 text-sm text-text-3">아티스트를 선택하면 연결된 멤버가 표시됩니다.</p>
              )}
            </div>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-r2 border border-border bg-white p-4 shadow-card">
        <h2 className="font-display text-base font-extrabold text-text-1">상태별 경매 분포</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(AUCTION_STATUS_LABEL).map(([status, label]) => (
            <div key={status} className="flex items-center justify-between rounded-r2 bg-surface-2 px-3 py-2">
              <span className="text-xs font-bold text-text-2">{label}</span>
              <span className="font-display text-sm font-extrabold text-text-1">
                {(dashboard.statusCounts[status] ?? 0).toLocaleString("ko-KR")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
