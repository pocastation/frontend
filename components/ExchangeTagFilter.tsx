"use client";

import { useCallback, useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TopProgressBar from "@/components/TopProgressBar";
import { apiFetch } from "@/lib/api";
import {
  MAX_EXCHANGE_TAGS,
  tagCount,
  tagQueryString,
  type ExchangeSide,
  type ExchangeTagQuery,
} from "@/lib/exchange-tags";
import { FOCUS_RING, PRESS_CHIP } from "@/lib/ui";
import type { ArtistMemberResponse, ArtistResponse, ExchangeFeedResponse } from "@/lib/types";

/**
 * 행사 피드의 해시태그 검색(#826).
 *
 * <p>지면을 세 층으로 가른다. 고른 태그 줄(헤어라인 해시태그), 그룹 칩 줄(투명), 펼친 그룹의 멤버
 * (회색 띠). 같은 칩 줄을 세 번 쌓으면 어느 줄이 고른 것이고 어느 줄이 고를 것인지 읽히지 않는다.
 *
 * <p>상태는 URL이 들고 있다. 누르는 즉시 칩을 바꾸려고 {@link useOptimistic}으로 앞서 그리고,
 * 서버가 새 목록을 내려주면 그 값으로 맞춰진다.
 */

const SIDES: { key: ExchangeSide; label: string; hint: string }[] = [
  { key: "HAVE", label: "원하는 포카로", hint: "고른 포카를 내놓은 글" },
  { key: "WANT", label: "가진 포카로", hint: "고른 포카를 받고 싶어 하는 글" },
];

type Members = ArtistMemberResponse[] | "loading" | "error";

export default function ExchangeTagFilter({
  eventId,
  query,
  artists,
  totalElements,
}: {
  eventId: string;
  query: ExchangeTagQuery;
  artists: ExchangeFeedResponse["artists"];
  /** 태그를 고르면 서버 합계가 걸러진 건수라 「전체」 옆에 쓸 수 없다. 그때는 null이다. */
  totalElements: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setOptimistic] = useOptimistic(query);

  // 처음 펼칠 그룹: 링크로 들어왔으면 마지막에 고른 태그의 그룹.
  const [openId, setOpenId] = useState<number | null>(
    () => query.idols.at(-1)?.artistId ?? query.artistIds.at(-1) ?? null,
  );
  const [members, setMembers] = useState<Record<number, Members>>({});
  // 칩 집계에 없는 그룹(기준을 바꿔 글이 0건이 된 그룹)의 이름.
  const [extraNames, setExtraNames] = useState<Record<number, string>>({});

  const loadMembers = useCallback((artistId: number) => {
    setMembers((prev) => ({ ...prev, [artistId]: "loading" }));
    apiFetch<{ content: ArtistMemberResponse[] }>(`/api/artists/${artistId}/idols`)
      .then((res) => setMembers((prev) => ({ ...prev, [artistId]: res.content })))
      .catch(() => setMembers((prev) => ({ ...prev, [artistId]: "error" })));
  }, []);

  // 멤버 이름이 필요한 그룹: 펼친 그룹 + 멤버 태그가 걸린 그룹.
  const neededGroups = [...new Set([...(openId ? [openId] : []), ...q.idols.map((t) => t.artistId)])];
  const missingGroups = neededGroups.filter((id) => members[id] === undefined);
  useEffect(() => {
    // 필요한 그룹의 멤버를 처음 볼 때 한 번 불러온다.
    missingGroups.forEach(loadMembers);
  }, [missingGroups.join(","), loadMembers]); // eslint-disable-line react-hooks/exhaustive-deps

  const knownNames = new Map(artists.map((a) => [a.artistId, a.artistName ?? "알 수 없음"]));
  const unnamed = q.artistIds.filter((id) => !knownNames.has(id) && extraNames[id] === undefined);
  useEffect(() => {
    unnamed.forEach((id) => {
      apiFetch<ArtistResponse>(`/api/artists/${id}`)
        .then((a) => setExtraNames((prev) => ({ ...prev, [id]: a.name })))
        .catch(() => setExtraNames((prev) => ({ ...prev, [id]: "알 수 없음" })));
    });
  }, [unnamed.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupName = (id: number) => knownNames.get(id) ?? extraNames[id] ?? "…";
  const idolName = (artistId: number, idolId: number) => {
    const list = members[artistId];
    return Array.isArray(list) ? (list.find((m) => m.idolId === idolId)?.stageName ?? "알 수 없음") : "…";
  };

  const full = tagCount(q) >= MAX_EXCHANGE_TAGS;
  const hasTags = tagCount(q) > 0;

  function go(next: ExchangeTagQuery) {
    startTransition(() => {
      setOptimistic(next);
      router.push(`/events/${eventId}${tagQueryString(next)}`, { scroll: false });
    });
  }

  // 멤버 태그의 그룹은 항상 그룹 태그로도 들어 있다(parseTagQuery).
  const groupOn = (id: number) => q.artistIds.includes(id);
  const hasMembers = (id: number) => q.idols.some((t) => t.artistId === id);

  function pressGroup(id: number) {
    if (!groupOn(id)) {
      if (full) return;
      setOpenId(id);
      go({ ...q, artistIds: [...q.artistIds, id] });
      return;
    }
    // 고른 그룹을 처음 누르면 멤버를 펼치고, 펼친 채 한 번 더 누르면 그룹과 그 멤버를 함께 푼다.
    if (openId !== id) {
      setOpenId(id);
      return;
    }
    removeGroup(id);
  }

  function pressIdol(artistId: number, idolId: number) {
    if (q.idols.some((t) => t.idolId === idolId)) {
      removeIdol(idolId);
      return;
    }
    // 그룹의 첫 멤버는 서버로 가는 그룹 태그를 대신하므로 개수가 늘지 않는다.
    if (full && hasMembers(artistId)) return;
    go({
      ...q,
      artistIds: groupOn(artistId) ? q.artistIds : [...q.artistIds, artistId],
      idols: [...q.idols, { artistId, idolId }],
    });
  }

  function removeGroup(id: number) {
    if (openId === id) setOpenId(null);
    go({
      ...q,
      artistIds: q.artistIds.filter((a) => a !== id),
      idols: q.idols.filter((t) => t.artistId !== id),
    });
  }

  function removeIdol(idolId: number) {
    go({ ...q, idols: q.idols.filter((t) => t.idolId !== idolId) });
  }

  const openMembers = openId !== null ? members[openId] : undefined;
  const side = SIDES.find((s) => s.key === q.side) ?? SIDES[0];

  return (
    <section aria-label="교환글 해시태그 검색" className="border-b border-border">
      <TopProgressBar active={pending} />

      <div className="flex items-baseline gap-4 px-gutter pt-3 sm:px-0" role="radiogroup" aria-label="검색 기준">
        {SIDES.map((s) => {
          const on = s.key === q.side;
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => !on && go({ ...q, side: s.key })}
              className={`border-b-2 pb-1 text-body-s ${FOCUS_RING} ${
                on ? "border-text-1 font-extrabold text-text-1" : "border-transparent font-medium text-text-3"
              }`}
            >
              {s.label}
            </button>
          );
        })}
        <span className="ml-auto truncate text-label text-text-3">{side.hint}</span>
      </div>

      {hasTags && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-gutter pt-3 sm:px-0" aria-label="고른 태그">
          {/* 멤버는 그 그룹 태그 바로 뒤에 잇는다. 묶음 안은 좁게, 묶음 사이는 넓게 띄워 어느 그룹의
              멤버인지 읽히게 한다. */}
          {q.artistIds.map((id) => (
            <span key={id} className="flex flex-wrap items-center gap-1">
              <SelectedTag label={groupName(id)} onRemove={() => removeGroup(id)} />
              {q.idols
                .filter((t) => t.artistId === id)
                .map((t) => (
                  <SelectedTag
                    key={t.idolId}
                    label={idolName(t.artistId, t.idolId)}
                    onRemove={() => removeIdol(t.idolId)}
                  />
                ))}
            </span>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpenId(null);
              go({ ...q, artistIds: [], idols: [] });
            }}
            className={`ml-1 py-1 text-label font-semibold text-text-3 underline underline-offset-2 ${FOCUS_RING}`}
          >
            모두 해제
          </button>
        </div>
      )}

      {artists.length > 0 && (
        <nav aria-label="그룹 태그" className="flex gap-2 overflow-x-auto px-gutter py-3 sm:px-0">
          <GroupChip on={!hasTags} onClick={() => hasTags && go({ ...q, artistIds: [], idols: [] })}>
            전체{totalElements !== null && <span className="tabular-nums"> {totalElements}</span>}
          </GroupChip>
          {artists.map((a) => (
            <GroupChip
              key={a.artistId}
              on={groupOn(a.artistId)}
              expanded={openId === a.artistId}
              disabled={full && !groupOn(a.artistId)}
              onClick={() => pressGroup(a.artistId)}
            >
              #{a.artistName ?? "알 수 없음"} <span className="tabular-nums">{a.count}</span>
            </GroupChip>
          ))}
        </nav>
      )}

      {openId !== null && (
        <div className="bg-surface-2 px-gutter py-3 sm:px-4" aria-label={`${groupName(openId)} 멤버 태그`} role="group">
          <p className="text-label text-text-3">
            {groupName(openId)} 멤버
            {full && <span className="ml-2">태그는 {MAX_EXCHANGE_TAGS}개까지 고를 수 있어요.</span>}
          </p>
          {openMembers === "error" ? (
            <p className="mt-2 text-body-s text-text-2">
              멤버를 불러오지 못했어요.{" "}
              <button
                type="button"
                onClick={() => loadMembers(openId)}
                className={`font-bold text-text-1 underline underline-offset-2 ${FOCUS_RING}`}
              >
                다시 시도
              </button>
            </p>
          ) : !Array.isArray(openMembers) ? (
            <p className="mt-2 text-body-s text-text-3">멤버를 불러오는 중...</p>
          ) : openMembers.length === 0 ? (
            <p className="mt-2 text-body-s text-text-3">등록된 멤버가 없어요.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {openMembers.map((m) => {
                const on = q.idols.some((t) => t.idolId === m.idolId);
                const disabled = !on && full && hasMembers(openId);
                return (
                  <button
                    key={m.idolId}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled}
                    onClick={() => pressIdol(openId, m.idolId)}
                    className={`min-h-9 rounded-control border bg-white px-3 text-body-s disabled:opacity-40 ${FOCUS_RING} ${
                      on ? "border-primary font-extrabold text-primary" : `border-border font-medium text-text-2 ${PRESS_CHIP}`
                    }`}
                  >
                    #{m.stageName}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SelectedTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`${label} 태그 해제`}
      className={`flex min-h-8 items-center gap-1 rounded-control border border-border pl-2 pr-1 text-label font-bold text-primary ${PRESS_CHIP} ${FOCUS_RING}`}
    >
      #{label}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-3" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

function GroupChip({
  on,
  expanded,
  disabled,
  onClick,
  children,
}: {
  on: boolean;
  expanded?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
      /* 선택된 칩(보라)에는 눌림 배경을 주지 않는다 — 선택 결과와 눌림이 섞인다(#720). */
      className={`shrink-0 whitespace-nowrap rounded-control border px-3 py-2 text-label font-bold disabled:opacity-40 ${FOCUS_RING} ${
        on ? "border-primary bg-primary text-white" : `border-border-2 text-text-2 ${PRESS_CHIP}`
      }`}
    >
      {children}
    </button>
  );
}
