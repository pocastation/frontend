"use client";

import { useEffect, useState } from "react";
import ExchangeFeedRow from "@/components/ExchangeFeedRow";
import ExchangeTagFilter from "@/components/ExchangeTagFilter";
import { useAuth } from "@/lib/auth-context";
import { feedApiQuery, tagCount, type ExchangeTagQuery } from "@/lib/exchange-tags";
import type { ExchangeFeedResponse, MyExchangePage, MyExchangePost } from "@/lib/types";

/** 내 글 대조에 받는 건수. 서버 상한(Pagination.DEFAULT_MAX_SIZE)과 같다. 최신순이라 피드에 걸리는
 *  열린 글은 이 안에 든다. */
const MY_POSTS_SIZE = 100;

/**
 * 행사 피드의 검색 줄과 목록(#826).
 *
 * <p>서버 렌더링이 먼저 비로그인 기준 목록을 그린다. 서버 컴포넌트의 요청에는 로그인이 실리지
 * 않아(lib/api.ts) 백엔드가 보는 사람을 모르고, 그러면 차단으로 엮인 상대의 글이 걸러지지 않는다.
 * 로그인한 사람이면 같은 조건을 인증 요청으로 다시 받아 바꿔 끼운다. 칩 집계도 차단을 빼고
 * 세므로 목록과 함께 바꾼다.
 */
export default function EventExchangeFeed({
  eventId,
  tags,
  initialFeed,
}: {
  eventId: string;
  tags: ExchangeTagQuery;
  initialFeed: ExchangeFeedResponse | null;
}) {
  const { member, isLoading, fetchWithAuth } = useAuth();
  const path = `/api/events/${eventId}/exchanges${feedApiQuery(tags)}`;
  // 어느 조건으로 받은 목록인지 함께 든다. 태그를 바꾸면 서버가 새 목록을 내려주고, 이전 조건의
  // 인증 목록은 버린다.
  const [authed, setAuthed] = useState<{ path: string; feed: ExchangeFeedResponse } | null>(null);
  const memberId = member?.id;

  useEffect(() => {
    if (isLoading || !memberId) return;
    let cancelled = false;
    fetchWithAuth<ExchangeFeedResponse>(path, { cache: "no-store" })
      .then((feed) => {
        if (!cancelled) setAuthed({ path, feed });
      })
      // 실패하면 서버가 그린 목록을 그대로 둔다. 차단 제외가 빠질 뿐 화면은 쓸 수 있다.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoading, memberId, path, fetchWithAuth]);

  // 내가 올린 글(#832). 피드 응답에 작성자가 없어 내 교환글 목록의 id와 대조한다. 행사와 무관하게
  // 한 번만 받는다 — 태그를 바꿀 때마다 다시 받을 이유가 없다.
  const [mine, setMine] = useState<{ memberId: string; ids: Set<number> } | null>(null);
  useEffect(() => {
    if (isLoading || !memberId) return;
    let cancelled = false;
    fetchWithAuth<MyExchangePage<MyExchangePost>>(`/api/members/me/exchange-posts?page=0&size=${MY_POSTS_SIZE}`)
      .then((res) => {
        if (!cancelled) setMine({ memberId, ids: new Set(res.content.map((p) => p.postId)) });
      })
      // 실패하면 표시만 빠진다. 목록은 그대로 쓸 수 있다.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoading, memberId, fetchWithAuth]);
  const myIds = mine && mine.memberId === memberId ? mine.ids : null;

  const feed = memberId && authed?.path === path ? authed.feed : initialFeed;
  const tagged = tagCount(tags) > 0;

  return (
    <>
      {/* 글이 하나도 없는 행사에는 고를 태그도 없다. 기준을 바꾸면 집계가 달라지므로 태그를 고른
          상태에서는 칩이 비어도 검색 줄을 남긴다 — 고른 태그를 풀 자리가 사라지면 안 된다. */}
      {feed && (feed.totalElements > 0 || feed.artists.length > 0 || tagged || tags.side === "WANT") && (
        <ExchangeTagFilter
          eventId={eventId}
          query={tags}
          artists={feed.artists}
          totalElements={tagged ? null : feed.totalElements}
        />
      )}

      <div className="px-gutter sm:px-0">
        {feed === null ? (
          <p className="py-12 text-center text-body-s text-text-3">
            교환글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : feed.content.length === 0 ? (
          <p className="py-12 text-center text-body-s text-text-3">
            {tagged
              ? tags.side === "HAVE"
                ? "고른 태그의 포카를 내놓은 글이 없어요."
                : "고른 태그의 포카를 받고 싶어 하는 글이 없어요."
              : "이 행사의 교환글이 아직 없어요."}
          </p>
        ) : (
          <ul className="pt-1">
            {feed.content.map((item) => (
              <ExchangeFeedRow key={item.id} item={item} mine={myIds?.has(item.id) ?? false} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
